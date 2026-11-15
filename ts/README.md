# nameguard

Checks whether a name is okay to use as a store slug, subdomain or username. It blocks reserved names, brand lookalikes, abusive words (English and Hinglish) and scam terms. No dependencies.

## Install

```sh
npm install nameguard
```

## Use

```ts
import { check } from "nameguard";

// names your platform keeps for itself
check("support");           // { ok: false, reason: "reserved" }
check("adm1n");             // { ok: false, reason: "reserved" }
check("a-d-m-i-n");         // { ok: false, reason: "reserved" }

// brands and lookalikes
check("hdfc-bank");         // { ok: false, reason: "brand" }
check("g00gle-store");      // { ok: false, reason: "brand" }
check("paytm-support");     // { ok: false, reason: "brand" }

// abusive words, English and Hinglish
check("sh1t-store");        // { ok: false, reason: "abusive" }
check("f-u-c-k");           // { ok: false, reason: "abusive" }
check("chut-shop");         // { ok: false, reason: "abusive" }

// scam terms
check("scam-alert");        // { ok: false, reason: "scam" }
check("phishing-kit");      // { ok: false, reason: "scam" }

// fine, even though some contain a bad word
check("demostore");         // { ok: true }
check("assam-silk");        // { ok: true }
check("mail-order-store");  // { ok: true }
check("chutney-house");     // { ok: true }
```

Tricks like hyphens and swapped digits are caught, and innocent names that happen to contain a bad word (`assam-silk`, `mail-order-store`) pass.

In a signup form:

```ts
const result = check(slug);
if (!result.ok) {
  showError("That name isn't available.");
}
```

Show people one generic message and keep `result.reason` for your logs. Telling them which rule they hit makes the list easy to map.

## Choose what to filter

```ts
check("fuck-you", { categories: ["brand"] });   // { ok: true }, abuse is switched off
check("chutiya", { languages: ["en"] });        // { ok: true }, Hinglish is switched off
check("razorpai", { level: "strict" });         // { ok: false, reason: "brand" }, catches typos
check("merchantly", { block: ["merchantly"] }); // { ok: false, reason: "blocked" }
check("paytm", { allow: ["paytm"] });           // { ok: true }
check("john.doe", { profile: "username" });     // { ok: true }
```

If you check many names, build a guard once and reuse it:

```ts
import { createGuard } from "nameguard";

const guard = createGuard({ categories: ["reserved", "brand"], level: "strict" });
guard.check("my-store");
```

Reasons: `too_short`, `too_long`, `invalid_format`, `reserved`, `brand`, `abusive`, `scam`, `blocked`.

All options, the match levels, how matching works and the word list are in the [main README](https://github.com/SyedEhsan06/nameguard#readme).
