/* The one shared list of guide videos. The Help page, every "Watch" link, Sage and the Telegram
 * support bot all read this file, and the API server imports it too (keep it free of imports).
 * To replace a video, upload a new file under the same slug; nothing here changes.
 * Built from salt-peps-videos-latest/videos.json. */

export type HelpVideoAudience = "public" | "member" | "organiser" | "reshipper" | "pool-leader" | "vendor";
export type HelpVideoCategory =
  | "Paying" | "Group buys" | "Shared orders and wholesale" | "Testing" | "Your account" | "The Lonely Vial"
  | "Common questions" | "Get involved" | "Your tools" | "Vendor portal";
export interface HelpVideoChapter { slug: string; title: string; length: string }
export interface HelpVideo {
  /** Short permanent name, also the stored file name. */
  slug: string;
  title: string;
  /** Minutes and seconds. */
  length: string;
  category: HelpVideoCategory;
  /** Who may watch it. The streaming route enforces the same rule. */
  audience: HelpVideoAudience;
  summary: string;
  /** Words Sage, the Telegram bot and the Help search match on. */
  keywords: string[];
  /** Phone-shaped recording of the same video. */
  mobileSlug?: string;
  /** True for the phone recordings themselves; they are not listed as separate cards. */
  phoneVersion?: boolean;
  /** Hidden while the wholesale switch is off. */
  wholesale?: boolean;
  /** Where a member applies for the role this video explains. */
  applyHref?: string;
  chapters?: HelpVideoChapter[];
}

export const HELP_VIDEOS: HelpVideo[] = [
  {"slug": "crypto-coinbase-to-cake-wallet", "title": "Paying with crypto: Coinbase to Cake Wallet", "length": "4:17", "category": "Paying", "audience": "public", "summary": "Buy on Coinbase, move your coins to Cake Wallet and pay your order", "keywords": ["crypto", "coinbase", "cake wallet", "pay", "bitcoin", "monero", "transaction hash", "txid"], "chapters": [{"slug": "crypto-coinbase-to-cake-wallet-before-you-start", "title": "Before you start", "length": "1:19"}, {"slug": "crypto-coinbase-to-cake-wallet-step-1-your-wallet", "title": "Step 1: your wallet", "length": "0:23"}, {"slug": "crypto-coinbase-to-cake-wallet-step-2-buy", "title": "Step 2: buy", "length": "0:35"}, {"slug": "crypto-coinbase-to-cake-wallet-step-3-move-your-coins", "title": "Step 3: move your coins", "length": "0:47"}, {"slug": "crypto-coinbase-to-cake-wallet-step-4-pay", "title": "Step 4: pay", "length": "1:09"}]},
  {"slug": "crypto-coinbase-to-exodus", "title": "Paying with crypto: Coinbase to Exodus", "length": "4:23", "category": "Paying", "audience": "public", "summary": "Buy on Coinbase, move your coins to Exodus and pay your order", "keywords": ["crypto", "coinbase", "exodus", "pay", "bitcoin", "transaction hash", "txid"], "chapters": [{"slug": "crypto-coinbase-to-exodus-before-you-start", "title": "Before you start", "length": "1:21"}, {"slug": "crypto-coinbase-to-exodus-step-1-your-wallet", "title": "Step 1: your wallet", "length": "0:27"}, {"slug": "crypto-coinbase-to-exodus-step-2-buy", "title": "Step 2: buy", "length": "0:35"}, {"slug": "crypto-coinbase-to-exodus-step-3-move-your-coins", "title": "Step 3: move your coins", "length": "0:47"}, {"slug": "crypto-coinbase-to-exodus-step-4-pay", "title": "Step 4: pay", "length": "1:09"}]},
  {"slug": "crypto-kraken-to-cake-wallet", "title": "Paying with crypto: Kraken to Cake Wallet", "length": "4:27", "category": "Paying", "audience": "public", "summary": "Buy on Kraken, move your coins to Cake Wallet and pay your order", "keywords": ["crypto", "kraken", "cake wallet", "pay", "bitcoin", "monero", "transaction hash", "txid"], "chapters": [{"slug": "crypto-kraken-to-cake-wallet-before-you-start", "title": "Before you start", "length": "1:20"}, {"slug": "crypto-kraken-to-cake-wallet-step-1-your-wallet", "title": "Step 1: your wallet", "length": "0:23"}, {"slug": "crypto-kraken-to-cake-wallet-step-2-buy", "title": "Step 2: buy", "length": "0:38"}, {"slug": "crypto-kraken-to-cake-wallet-step-3-move-your-coins", "title": "Step 3: move your coins", "length": "0:55"}, {"slug": "crypto-kraken-to-cake-wallet-step-4-pay", "title": "Step 4: pay", "length": "1:07"}]},
  {"slug": "crypto-kraken-to-exodus", "title": "Paying with crypto: Kraken to Exodus", "length": "4:31", "category": "Paying", "audience": "public", "summary": "Buy on Kraken, move your coins to Exodus and pay your order", "keywords": ["crypto", "kraken", "exodus", "pay", "bitcoin", "transaction hash", "txid"], "chapters": [{"slug": "crypto-kraken-to-exodus-before-you-start", "title": "Before you start", "length": "1:20"}, {"slug": "crypto-kraken-to-exodus-step-1-your-wallet", "title": "Step 1: your wallet", "length": "0:27"}, {"slug": "crypto-kraken-to-exodus-step-2-buy", "title": "Step 2: buy", "length": "0:38"}, {"slug": "crypto-kraken-to-exodus-step-3-move-your-coins", "title": "Step 3: move your coins", "length": "0:54"}, {"slug": "crypto-kraken-to-exodus-step-4-pay", "title": "Step 4: pay", "length": "1:06"}]},
  {"slug": "ordering-and-paying", "title": "Ordering and paying", "length": "1:51", "category": "Paying", "audience": "public", "summary": "Build an order, check out and choose how to pay", "keywords": ["order", "checkout", "pay", "payment", "basket", "how to order"]},
  {"slug": "batch-system", "title": "HGH group buy: how the batch system works", "length": "1:57", "category": "Group buys", "audience": "public", "summary": "What a batch is and when your kits are ordered", "keywords": ["batch", "kit limit", "HGH", "group buy", "when ordered"]},
  {"slug": "uther-gb", "title": "Uther group buy", "length": "1:56", "category": "Group buys", "audience": "public", "summary": "Joining and ordering in the Uther group buy", "keywords": ["uther", "group buy", "join", "order"]},
  {"slug": "half-kits", "title": "Half kits", "length": "1:02", "category": "Group buys", "audience": "public", "summary": "Split a kit with another member", "keywords": ["half kit", "split", "share a kit", "offer"]},
  {"slug": "shared-orders", "title": "Shared orders", "length": "2:17", "category": "Shared orders and wholesale", "audience": "member", "summary": "Join or start a shared wholesale order with other members", "keywords": ["shared order", "split order", "join", "wholesale share", "invite code"], "wholesale": true},
  {"slug": "wholesale", "title": "Wholesale", "length": "2:19", "category": "Shared orders and wholesale", "audience": "member", "summary": "How wholesale ordering works and who it is for", "keywords": ["wholesale", "bulk", "vendor", "minimum order"], "wholesale": true},
  {"slug": "testing-pools", "title": "Testing pools", "length": "1:39", "category": "Testing", "audience": "public", "summary": "Chip in with other members to get a product lab tested", "keywords": ["testing pool", "lab test", "contribute", "janoshik", "pool"]},
  {"slug": "gb-testing-pool", "title": "Group buy testing pool", "length": "1:33", "category": "Testing", "audience": "public", "summary": "How testing is funded inside a group buy", "keywords": ["group buy testing", "testing fund", "pool", "lab test"]},
  {"slug": "supplier-testing", "title": "Supplier testing", "length": "1:01", "category": "Testing", "audience": "public", "summary": "Testing paid for by the supplier and where to see the results", "keywords": ["supplier testing", "vendor test", "lab report"]},
  {"slug": "dashboard", "title": "How to use the dashboard", "length": "4:17", "category": "Your account", "audience": "public", "summary": "A tour of your dashboard: orders, group buys and tools", "keywords": ["dashboard", "account", "home", "tour", "where is", "navigation"], "mobileSlug": "dashboard-mobile"},
  {"slug": "dashboard-mobile", "title": "How to use the dashboard (phone version)", "length": "4:17", "category": "Your account", "audience": "public", "summary": "The dashboard tour, recorded on a phone", "keywords": ["dashboard", "phone", "mobile", "tour"], "phoneVersion": true},
  {"slug": "your-account-and-tracking", "title": "Your account and tracking", "length": "1:01", "category": "Your account", "audience": "public", "summary": "Find your orders and follow a parcel", "keywords": ["tracking", "where is my order", "parcel", "order status", "account"]},
  {"slug": "account-tools-tour", "title": "Account tools tour", "length": "1:12", "category": "Your account", "audience": "public", "summary": "The calculators, logs and other tools in your account", "keywords": ["tools", "calculator", "compounds", "blood tests", "account"]},
  {"slug": "uploading-your-qr-code", "title": "Uploading your QR code", "length": "1:22", "category": "Your account", "audience": "public", "summary": "Add your InPost or Royal Mail QR code to an order", "keywords": ["QR code", "upload", "InPost", "Royal Mail", "label"], "mobileSlug": "uploading-your-qr-code-mobile"},
  {"slug": "uploading-your-qr-code-mobile", "title": "Uploading your QR code (phone version)", "length": "1:22", "category": "Your account", "audience": "public", "summary": "Uploading your QR code, recorded on a phone", "keywords": ["QR code", "upload", "phone", "mobile"], "phoneVersion": true},
  {"slug": "support-tickets", "title": "Support tickets", "length": "1:47", "category": "Your account", "audience": "public", "summary": "Open a ticket and follow the reply", "keywords": ["ticket", "support", "help", "problem", "contact"]},
  {"slug": "telegram-bot", "title": "Telegram bot", "length": "1:00", "category": "Your account", "audience": "public", "summary": "Link the Telegram bot to get order updates", "keywords": ["telegram", "bot", "notifications", "link", "alerts"]},
  {"slug": "the-lonely-vial-shop", "title": "The Lonely Vial shop", "length": "1:18", "category": "The Lonely Vial", "audience": "public", "summary": "Buy single vials from other members", "keywords": ["lonely vial", "shop", "single vial", "buy"]},
  {"slug": "selling-on-the-lonely-vial", "title": "Selling on The Lonely Vial", "length": "1:08", "category": "Get involved", "audience": "member", "summary": "List your spare vials and get paid", "keywords": ["sell", "seller", "lonely vial", "listing", "apply to sell"], "applyHref": "/seller"},
  {"slug": "becoming-a-reshipper", "title": "Becoming a reshipper", "length": "0:57", "category": "Get involved", "audience": "public", "summary": "What a reshipper does and how to apply", "keywords": ["reshipper", "apply", "reship", "become"], "applyHref": "/reshipper-apply"},
  {"slug": "reshippers", "title": "Reshippers", "length": "1:54", "category": "Get involved", "audience": "member", "summary": "The full reshipper guide: boxes, members and postage", "keywords": ["reshipper", "guide", "postage", "boxes", "dispatch"], "applyHref": "/reshipper-apply"},
  {"slug": "pool-leader", "title": "Pool leader", "length": "1:41", "category": "Get involved", "audience": "member", "summary": "Run a testing pool: set it up, collect and report", "keywords": ["pool leader", "run a pool", "testing pool", "apply"], "applyHref": "/account?s=lab-pool"},
  {"slug": "organiser-1-create", "title": "Organiser 1: create", "length": "2:19", "category": "Get involved", "audience": "member", "summary": "Create a group buy as an organiser", "keywords": ["organiser", "create group buy", "set up", "apply"], "applyHref": "/gborganiser"},
  {"slug": "organiser-2-orders", "title": "Organiser 2: orders", "length": "1:39", "category": "Your tools", "audience": "organiser", "summary": "Manage member orders in your group buy", "keywords": ["organiser", "orders", "mark paid", "members"]},
  {"slug": "organiser-3-dispatch", "title": "Organiser 3: dispatch", "length": "1:20", "category": "Your tools", "audience": "organiser", "summary": "Pack and dispatch your group buy", "keywords": ["organiser", "dispatch", "packing", "shipping"]},
  {"slug": "organiser-4-tools", "title": "Organiser 4: tools", "length": "1:31", "category": "Your tools", "audience": "organiser", "summary": "The extra organiser tools", "keywords": ["organiser", "tools", "coupons", "refunds", "updates"]},
  {"slug": "pool-leader-2-options", "title": "Pool leader 2: options", "length": "1:04", "category": "Your tools", "audience": "pool-leader", "summary": "Payment and pool options for pool leaders", "keywords": ["pool leader", "options", "wallet", "settings"]},
  {"slug": "reshippers-2-qr-and-box-checks", "title": "Reshippers 2: QR codes and box checks", "length": "1:06", "category": "Your tools", "audience": "reshipper", "summary": "QR codes and box checks for reshippers", "keywords": ["reshipper", "QR code", "box check", "scan"]},
  {"slug": "faq-group-buys", "title": "Common questions: group buys", "length": "2:07", "category": "Common questions", "audience": "public", "summary": "Short answers to the usual group buy questions", "keywords": ["faq", "group buy", "questions"]},
  {"slug": "faq-batch-system", "title": "Common questions: the batch system", "length": "1:31", "category": "Common questions", "audience": "public", "summary": "Short answers about batches and kit limits", "keywords": ["faq", "batch", "kit limit", "questions"]},
  {"slug": "faq-shared-orders", "title": "Common questions: shared orders", "length": "1:35", "category": "Common questions", "audience": "member", "summary": "Short answers about shared orders", "keywords": ["faq", "shared order", "questions"], "wholesale": true},
  {"slug": "faq-wholesale", "title": "Common questions: wholesale", "length": "1:35", "category": "Common questions", "audience": "member", "summary": "Short answers about wholesale", "keywords": ["faq", "wholesale", "questions"], "wholesale": true},
  {"slug": "faq-testing-pools", "title": "Common questions: testing pools", "length": "1:42", "category": "Common questions", "audience": "public", "summary": "Short answers about testing pools", "keywords": ["faq", "testing pool", "questions"]},
  {"slug": "faq-lab-tests", "title": "Common questions: lab tests", "length": "1:25", "category": "Common questions", "audience": "public", "summary": "How to read a lab report and what the numbers mean", "keywords": ["faq", "lab test", "lab report", "purity", "janoshik", "COA"]},
  {"slug": "vendor-portal", "title": "Vendor portal tour", "length": "1:14", "category": "Vendor portal", "audience": "vendor", "summary": "A tour of the vendor portal for suppliers", "keywords": ["vendor portal", "supplier", "fulfilment"]},
];

export const HELP_VIDEO_BY_SLUG: Record<string, HelpVideo> = Object.fromEntries(HELP_VIDEOS.map(video => [video.slug, video]));

/** Every playable slug (videos and their chapter clips) with the audience that may watch it. */
export const HELP_VIDEO_AUDIENCE: Record<string, HelpVideoAudience> = Object.fromEntries(
  HELP_VIDEOS.flatMap(video => [[video.slug, video.audience], ...(video.chapters ?? []).map(chapter => [chapter.slug, video.audience])]),
);

export type HelpViewer = { loggedIn: boolean; organiser: boolean; reshipper: boolean; poolLeader: boolean; vendor?: boolean; wholesaleEnabled: boolean };
/** The single rule for who sees which video; used by the page, the assistants and the streaming route. */
export function canWatchHelpVideo(video: Pick<HelpVideo, "audience" | "wholesale">, viewer: HelpViewer): boolean {
  if (video.wholesale && !viewer.wholesaleEnabled) return false;
  switch (video.audience) {
    case "public": return true;
    case "member": return viewer.loggedIn;
    case "organiser": return viewer.organiser;
    case "reshipper": return viewer.reshipper;
    case "pool-leader": return viewer.poolLeader;
    case "vendor": return !!viewer.vendor;
  }
}

export const CRYPTO_EXCHANGES = [{ id: "coinbase", label: "Coinbase" }, { id: "kraken", label: "Kraken" }] as const;
export const CRYPTO_WALLETS = [{ id: "cake-wallet", label: "Cake Wallet" }, { id: "exodus", label: "Exodus" }] as const;
export type CryptoExchange = typeof CRYPTO_EXCHANGES[number]["id"];
export type CryptoWallet = typeof CRYPTO_WALLETS[number]["id"];
export const cryptoGuideSlug = (exchange: CryptoExchange, wallet: CryptoWallet) => `crypto-${exchange}-to-${wallet}`;
export const helpVideoUrl = (slug: string) => `/api/help-videos/${slug}`;
export const helpPosterUrl = (slug: string) => `/api/help-videos/${slug}/poster`;
