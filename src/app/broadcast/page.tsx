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

const steps = [
    { num: 1, label: "Select Template", icon: FileText },
    { num: 2, label: "Configure Variables", icon: Users },
    { num: 3, label: "Upload Recipients", icon: Upload },
];

export default function BroadcastPage() {
    const { data: templates } = useTemplates();
    const activeNumber = useAppStore((s) => s.activeNumber);
    const numbers = useAppStore((s) => s.numbers);
    const [step, setStep] = useState<WizardStep>(1);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [selectedNumber, setSelectedNumber] = useState<string>(activeNumber?.number || "");
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [csvData, setCsvData] = useState<string[]>([]);
    const [csvFileName, setCsvFileName] = useState("");

    const approvedTemplates = templates?.filter((t) => t.status === "approved");

    const bodyComponent = selectedTemplate?.components.find(
        (c) => c.type === "BODY"
    );
    const templateVars = bodyComponent
        ? parseTemplateVariables(bodyComponent.text || "")
        : [];

    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCsvFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean);
            // Skip header if present
            const phones = lines.filter((l) => /^\+?\d[\d\s\-]+$/.test(l));
            setCsvData(phones);
        };
        reader.readAsText(file);
    };

    const handleSendCampaign = () => {
        // In a real app, this would call a batch send endpoint
        alert(
            `Campaign sent!\n\nTemplate: ${selectedTemplate?.name}\nNumber: +${selectedNumber}\nRecipients: ${csvData.length}\nVariables: ${JSON.stringify(variables)}`
        );
        // Reset
        setStep(1);
        setSelectedTemplate(null);
        setVariables({});
        setCsvData([]);
        setCsvFileName("");
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
                                        {approvedTemplates?.map((tpl) => {
                                            const body = tpl.components.find(
                                                (c) => c.type === "BODY"
                                            );
                                            const isSelected = selectedTemplate?.id === tpl.id;
                                            return (
                                                <button
                                                    key={tpl.id}
                                                    onClick={() => setSelectedTemplate(tpl)}
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
                                                        <p className="text-xs text-slate-500 mt-1">
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
                                        Next: Configure Variables
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Fill Template Variables
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Template Preview */}
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 mb-4">
                                    <p className="text-xs text-slate-600 font-medium mb-1">
                                        Template: {selectedTemplate?.name.replace(/_/g, " ")}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {bodyComponent?.text}
                                    </p>
                                </div>

                                {templateVars.length > 0 ? (
                                    <div className="space-y-3 mb-4">
                                        {templateVars.map((v, index) => (
                                            <div key={v}>
                                                <Label className="text-sm text-slate-700 mb-1.5 block">
                                                    Variable {index + 1} ({v})
                                                </Label>
                                                <Input
                                                    placeholder={`Value for ${v}`}
                                                    value={variables[v] || ""}
                                                    onChange={(e) =>
                                                        setVariables((prev) => ({
                                                            ...prev,
                                                            [v]: e.target.value,
                                                        }))
                                                    }
                                                    className="h-9"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 py-4 text-center">
                                        No variables in this template.
                                    </p>
                                )}

                                <div className="flex justify-between mt-4">
                                    <Button variant="outline" onClick={() => setStep(1)}>
                                        Back
                                    </Button>
                                    <Button
                                        onClick={() => setStep(3)}
                                        className="bg-emerald-500 hover:bg-emerald-600"
                                    >
                                        Next: Upload Recipients
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Upload Recipient List
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
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
                                            CSV file with one phone number per line
                                        </p>
                                    </label>
                                </div>

                                {csvData.length > 0 && (
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Users className="w-4 h-4 text-emerald-600" />
                                            <span className="text-sm font-medium text-slate-700">
                                                {csvData.length} recipients loaded
                                            </span>
                                        </div>
                                        <ScrollArea className="max-h-[150px]">
                                            <div className="space-y-1">
                                                {csvData.slice(0, 20).map((phone, i) => (
                                                    <div
                                                        key={i}
                                                        className="text-xs text-slate-500 py-1 px-2 bg-slate-50 rounded"
                                                    >
                                                        {phone}
                                                    </div>
                                                ))}
                                                {csvData.length > 20 && (
                                                    <p className="text-xs text-slate-400 py-1">
                                                        ...and {csvData.length - 20} more
                                                    </p>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                )}

                                {/* Summary */}
                                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 mb-4">
                                    <p className="text-sm font-medium text-emerald-800 mb-2">
                                        Campaign Summary
                                    </p>
                                    <div className="space-y-1 text-xs text-emerald-700">
                                        <p>
                                            Template:{" "}
                                            {selectedTemplate?.name.replace(/_/g, " ")}
                                        </p>
                                        <p>
                                            From: +{selectedNumber || activeNumber?.number || "Not selected"}
                                        </p>
                                        <p>Recipients: {csvData.length}</p>
                                        {Object.entries(variables).map(([k, v]) => (
                                            <p key={k}>
                                                {k}: {v}
                                            </p>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-between">
                                    <Button variant="outline" onClick={() => setStep(2)}>
                                        Back
                                    </Button>
                                    <Button
                                        onClick={handleSendCampaign}
                                        disabled={csvData.length === 0}
                                        className="bg-emerald-500 hover:bg-emerald-600 gap-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        Send Campaign ({csvData.length} recipients)
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
