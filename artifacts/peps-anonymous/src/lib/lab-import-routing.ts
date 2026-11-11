export const JANOSHIK_IMPORT_HELP =
  "Janoshik blocks server downloads. Use the Janoshik Bulk Browser Importer for links, or upload the certificate PDF/image for AI extraction. Open the report in your browser first and complete any Janoshik verification.";

export function janoshikUrls(urls: string[]): string[] {
  return urls.filter(value => {
    try {
      const url = new URL(value.trim());
      const host = url.hostname.toLowerCase();
      return ["https:", "http:"].includes(url.protocol) && (host === "janoshik.com" || host.endsWith(".janoshik.com"));
    } catch { return false; }
  });
}
