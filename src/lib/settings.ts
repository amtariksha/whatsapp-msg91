import { supabaseAdmin } from "./supabase";

export async function getAppSettings(): Promise<Record<string, string>> {
    const { data } = await supabaseAdmin.from("app_settings").select("key, value");
    const settings: Record<string, string> = {};
    for (const row of data || []) settings[row.key] = row.value;
    return settings;
}

export async function getAppSetting(
    key: string,
    defaultValue: string = ""
): Promise<string> {
    const { data } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", key)
        .single();
    return data?.value ?? defaultValue;
}
