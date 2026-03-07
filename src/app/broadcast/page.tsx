"use client";

import { useState } from "react";
import {
    Megaphone,
    ChevronRight,
    Upload,
    FileText,
    Check,
    Users,
    Send,
    Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn, parseTemplateVariables } from "@/lib/utils";
import { useTemplates } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import type { Template } from "@/lib/types";

type WizardStep = 1 | 2 | 3;

interface RecipientRow {
    phone: string;
    variables: Record<string, string>;
}

const steps = [
    { num: 1, label: "Select Template", icon: FileText },
    { num: 2, label: "Upload Recipients", icon: Upload },
    { num: 3, label: "Review & Send", icon: Send },
];

export default function BroadcastPage() {
    const { data: templates } = useTemplates();
    const activeNumber = useAppStore((s) => s.activeNumber);
    const numbers = useAppStore((s) => s.numbers);
    const [step, setStep] = useState<WizardStep>(1);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [selectedNumber, setSelectedNumber] = useState<string>(activeNumber?.number || "");
    const [recipientRows, setRecipientRows] = useState<RecipientRow[]>([]);
    const [csvFileName, setCsvFileName] = useState("");
    const [csvParseError, setCsvParseError] = useState("");
    const [isSending, setIsSending] = useState(false);

    const approvedTemplates = templates?.filter((t) => t.status?.toLowerCase() === "approved");

    const bodyComponent = selectedTemplate?.components.find(
        (c) => c.type === "BODY"
    );
    const templateVars = bodyComponent
        ? parseTemplateVariables(bodyComponent.text || "")
        : [];

    // Generate variable column headers from template vars: {{1}} → var_1, {{2}} → var_2
    const varColumns = templateVars.map((v) => {
        const num = v.replace(/[{}]/g, "");
        return `var_${num}`;
    });

    // ─── Download Sample CSV ────────────────────────────────────
    const handleDownloadSample = () => {
        if (!selectedTemplate) return;

        const headers = ["phone", ...varColumns].join(",");
        const sampleRows = [
            ["919876543210", ...varColumns.map((_, i) => `sample_value_${i + 1}`)].join(","),
            ["918765432109", ...varColumns.map((_, i) => `example_${i + 1}`)].join(","),
        ];

        const csvContent = [headers, ...sampleRows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `broadcast_${selectedTemplate.name}_sample.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // ─── Parse Uploaded CSV ─────────────────────────────────────
    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCsvFileName(file.name);
        setCsvParseError("");

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean);

            if (lines.length === 0) {
                setCsvParseError("CSV file is empty");
                return;
            }

            // Parse header row
            const headerLine = lines[0];
            const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());
            const phoneIdx = headers.findIndex(
                (h) => h === "phone" || h === "phone_number" || h === "number" || h === "mobile"
            );

            // If no header detected, treat all lines as phone-only
            if (phoneIdx === -1) {
                // Check if first line looks like a phone number (just digits)
                const firstLineIsPhone = /^\+?\d[\d\s\-]+$/.test(lines[0]);
                const startIdx = firstLineIsPhone ? 0 : 1;

                const rows: RecipientRow[] = [];
                for (let i = startIdx; i < lines.length; i++) {
                    const phone = lines[i].split(",")[0].trim().replace(/^\+/, "").replace(/[\s\-]/g, "");
                    if (/^\d{10,15}$/.test(phone)) {
                        rows.push({ phone, variables: {} });
                    }
                }
                setRecipientRows(rows);
                if (rows.length === 0) {
                    setCsvParseError("No valid phone numbers found in CSV");
                }
                return;
            }

            // Map variable columns: look for var_1, var_2, etc.
            const varIdxMap: Record<string, number> = {};
            for (const vc of varColumns) {
                const idx = headers.indexOf(vc);
                if (idx !== -1) {
                    varIdxMap[vc] = idx;
                }
            }

            // Parse data rows (skip header)
            const rows: RecipientRow[] = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = parseCSVLine(lines[i]);
                const phone = (cols[phoneIdx] || "").trim().replace(/^\+/, "").replace(/[\s\-]/g, "");
                if (!/^\d{10,15}$/.test(phone)) continue;

                const variables: Record<string, string> = {};
                for (const [colName, colIdx] of Object.entries(varIdxMap)) {
                    // Map var_1 → {{1}}, var_2 → {{2}}
                    const varNum = colName.replace("var_", "");
                    const varKey = `{{${varNum}}}`;
                    variables[varKey] = (cols[colIdx] || "").trim();
                }

                rows.push({ phone, variables });
            }

            setRecipientRows(rows);
            if (rows.length === 0) {
                setCsvParseError("No valid rows found. Ensure CSV has a 'phone' column header.");
            }
        };
        reader.readAsText(file);
    };

    // ─── Send Campaign ──────────────────────────────────────────
    const handleSendCampaign = async () => {
        if (!selectedTemplate || recipientRows.length === 0) return;
        setIsSending(true);

        try {
            // Check if we have per-recipient variables
            const hasPerRecipientVars = recipientRows.some(
                (r) => Object.keys(r.variables).length > 0
            );

            const recipients = hasPerRecipientVars
                ? recipientRows.map((r) => ({
                    phone: r.phone,
                    variables: r.variables,
                }))
                : recipientRows.map((r) => r.phone);

            const response = await fetch("/api/broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    templateId: selectedTemplate.name,
                    templateLanguage: selectedTemplate.language,
                    recipients,
                    integratedNumber: selectedNumber || activeNumber?.number || numbers[0]?.number,
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Failed to send broadcast");
            }

            alert(`Campaign Sent!\n\nSuccessfully broadcasted to ${recipientRows.length} recipients.`);

            // Reset
            setStep(1);
            setSelectedTemplate(null);
            setRecipientRows([]);
            setCsvFileName("");
            setCsvParseError("");
        } catch (error: any) {
            alert(`Broadcast Failed:\n\n${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="h-full overflow-auto p-6 bg-slate-50">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                        <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">
                            Broadcast Campaign
                        </h1>
                        <p className="text-sm text-slate-500">
                            Send template messages to multiple recipients
                        </p>
                    </div>
                </div>

                {/* Number Selector for Broadcast */}
                {numbers.length > 1 && (
                    <Card className="mb-4 border-slate-200">
                        <CardContent className="pt-4 pb-4">
                            <Label className="text-sm font-medium text-slate-700 mb-2 block">
                                Send from number
                            </Label>
                            <Select
                                value={selectedNumber}
                                onValueChange={setSelectedNumber}
                            >
                                <SelectTrigger className="w-full max-w-xs">
                                    <SelectValue placeholder="Select sending number" />
                                </SelectTrigger>
                                <SelectContent>
                                    {numbers.map((num) => (
                                        <SelectItem key={num.id} value={num.number}>
                                            {num.label} (+{num.number})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>
                )}

                {/* Step Indicator */}
                <div className="flex items-center gap-2 mb-6">
                    {steps.map((s, i) => {
                        const Icon = s.icon;
                        const isActive = step === s.num;
                        const isCompleted = step > s.num;
                        return (
                            <div key={s.num} className="flex items-center gap-2">
                                {i > 0 && (
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                )}
                                <div
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : isCompleted
                                                ? "bg-emerald-500 text-white"
                                                : "bg-slate-100 text-slate-400"
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        <Icon className="w-4 h-4" />
                                    )}
                                    <span className="hidden sm:inline">{s.label}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Step Content */}
                <Card className="border-slate-200 shadow-sm">
                    {/* ─── Step 1: Select Template ──────────────────────── */}
                    {step === 1 && (
                        <>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Choose an Approved Template
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="max-h-[400px]">
                                    <div className="space-y-2">
                                        {approvedTemplates?.length === 0 && (
                                            <div className="text-center py-8 text-slate-400">
                                                <p className="text-sm">No approved templates found</p>
                                                <p className="text-xs mt-1">Sync templates from MSG91 first</p>
                                            </div>
                                        )}
                                        {approvedTemplates?.map((tpl) => {
                                            const body = tpl.components.find(
                                                (c) => c.type === "BODY"
                                            );
                                            const isSelected = selectedTemplate?.id === tpl.id;
                                            return (
                                                <button
                                                    key={tpl.id}
                                                    onClick={() => {
                                                        setSelectedTemplate(tpl);
                                                        // Reset CSV when template changes
                                                        setRecipientRows([]);
                                                        setCsvFileName("");
                                                        setCsvParseError("");
                                                    }}
                                                    className={cn(
                                                        "w-full text-left p-4 rounded-xl border transition-colors",
                                                        isSelected
                                                            ? "border-emerald-300 bg-emerald-50"
                                                            : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium text-slate-900">
                                                            {tpl.name.replace(/_/g, " ")}
                                                        </span>
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-[10px] h-5"
                                                        >
                                                            {tpl.category}
                                                        </Badge>
                                                    </div>
                                                    {body?.text && (
                                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                            {body.text}
                                                        </p>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                                <div className="flex justify-end mt-4">
                                    <Button
                                        onClick={() => setStep(2)}
                                        disabled={!selectedTemplate}
                                        className="bg-emerald-500 hover:bg-emerald-600"
                                    >
                                        Next: Upload Recipients
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    )}

                    {/* ─── Step 2: Upload Recipients ────────────────────── */}
                    {step === 2 && (
                        <>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Upload Recipient List
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Template Preview */}
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 mb-4">
                                    <p className="text-xs text-slate-600 font-medium mb-1">
                                        Template: {selectedTemplate?.name.replace(/_/g, " ")}
                                    </p>
                                    <p className="text-xs text-slate-500 line-clamp-2">
                                        {bodyComponent?.text}
                                    </p>
                                    {templateVars.length > 0 && (
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <span className="text-[10px] text-slate-400">Variables:</span>
                                            {templateVars.map((v) => (
                                                <span key={v} className="inline-flex px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-mono rounded">
                                                    {v}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Download Sample CSV */}
                                <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
                                    <Download className="w-5 h-5 text-blue-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-blue-800">Download Sample CSV</p>
                                        <p className="text-xs text-blue-600 mt-0.5">
                                            {templateVars.length > 0
                                                ? `Columns: phone, ${varColumns.join(", ")} — fill in per-recipient values`
                                                : "Column: phone — one number per row"
                                            }
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadSample}
                                        className="shrink-0 border-blue-200 text-blue-700 hover:bg-blue-100"
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1.5" />
                                        Download
                                    </Button>
                                </div>

                                {/* CSV Upload */}
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center mb-4 hover:border-emerald-300 transition-colors">
                                    <input
                                        type="file"
                                        accept=".csv,.txt"
                                        onChange={handleCsvUpload}
                                        className="hidden"
                                        id="csv-upload"
                                    />
                                    <label htmlFor="csv-upload" className="cursor-pointer">
                                        <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-slate-600">
                                            {csvFileName || "Click to upload CSV"}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Upload the filled CSV with phone numbers{templateVars.length > 0 ? " and variable values" : ""}
                                        </p>
                                    </label>
                                </div>

                                {/* Parse Error */}
                                {csvParseError && (
                                    <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
                                        {csvParseError}
                                    </div>
                                )}

                                {/* Preview loaded data */}
                                {recipientRows.length > 0 && (
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Users className="w-4 h-4 text-emerald-600" />
                                            <span className="text-sm font-medium text-slate-700">
                                                {recipientRows.length} recipients loaded
                                            </span>
                                        </div>
                                        <ScrollArea className="max-h-[200px]">
                                            <div className="rounded-lg border border-slate-200 overflow-hidden">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-200">
                                                            <th className="px-3 py-2 text-left font-medium text-slate-600">#</th>
                                                            <th className="px-3 py-2 text-left font-medium text-slate-600">Phone</th>
                                                            {varColumns.map((vc) => (
                                                                <th key={vc} className="px-3 py-2 text-left font-medium text-slate-600">{vc}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {recipientRows.slice(0, 10).map((row, i) => (
                                                            <tr key={i} className="border-b border-slate-100 last:border-0">
                                                                <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                                                                <td className="px-3 py-1.5 text-slate-700 font-mono">{row.phone}</td>
                                                                {varColumns.map((vc) => {
                                                                    const varNum = vc.replace("var_", "");
                                                                    const varKey = `{{${varNum}}}`;
                                                                    return (
                                                                        <td key={vc} className="px-3 py-1.5 text-slate-600">
                                                                            {row.variables[varKey] || <span className="text-slate-300">—</span>}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {recipientRows.length > 10 && (
                                                    <div className="px-3 py-2 bg-slate-50 text-xs text-slate-400 text-center border-t border-slate-200">
                                                        ...and {recipientRows.length - 10} more recipients
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                )}

                                <div className="flex justify-between mt-4">
                                    <Button variant="outline" onClick={() => setStep(1)}>
                                        Back
                                    </Button>
                                    <Button
                                        onClick={() => setStep(3)}
                                        disabled={recipientRows.length === 0}
                                        className="bg-emerald-500 hover:bg-emerald-600"
                                    >
                                        Next: Review & Send
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    )}

                    {/* ─── Step 3: Review & Send ────────────────────────── */}
                    {step === 3 && (
                        <>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Review & Send Campaign
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Summary */}
                                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 mb-4 space-y-2">
                                    <p className="text-sm font-medium text-emerald-800">
                                        Campaign Summary
                                    </p>
                                    <div className="space-y-1.5 text-xs text-emerald-700">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>Template: <strong>{selectedTemplate?.name.replace(/_/g, " ")}</strong></span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Send className="w-3.5 h-3.5" />
                                            <span>From: <strong>{
                                                (selectedNumber || activeNumber?.number || numbers[0]?.number)
                                                    ? `+${selectedNumber || activeNumber?.number || numbers[0]?.number}`
                                                    : "(auto — first active number)"
                                            }</strong></span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-3.5 h-3.5" />
                                            <span>Recipients: <strong>{recipientRows.length}</strong></span>
                                        </div>
                                        {templateVars.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-3.5 h-3.5" />
                                                <span>
                                                    Variables: <strong>{templateVars.length}</strong>
                                                    {recipientRows.some((r) => Object.keys(r.variables).length > 0)
                                                        ? " (per-recipient from CSV)"
                                                        : " (none provided)"
                                                    }
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Template Preview */}
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 mb-4">
                                    <p className="text-xs font-medium text-slate-600 mb-1">Message Preview</p>
                                    <p className="text-xs text-slate-500 whitespace-pre-wrap">
                                        {bodyComponent?.text}
                                    </p>
                                </div>

                                <div className="flex justify-between">
                                    <Button variant="outline" onClick={() => setStep(2)}>
                                        Back
                                    </Button>
                                    <Button
                                        onClick={handleSendCampaign}
                                        disabled={recipientRows.length === 0 || isSending}
                                        className="bg-emerald-500 hover:bg-emerald-600 gap-2"
                                    >
                                        {isSending ? (
                                            "Sending..."
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Send to {recipientRows.length} Recipients
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
}

/** Parse a CSV line, handling quoted fields with commas inside */
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}
