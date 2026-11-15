# nameguard

Check if a name is okay to use as a store slug, subdomain or username. Blocks reserved names, brands, abusive words (English and Hinglish) and scam terms. No dependencies.

```sh
npm install nameguard
```

## Use

```ts
import { check } from "nameguard";

check("demostore");        // { ok: true }
check("adm1n");            // { ok: false, reason: "reserved" }
check("a-d-m-i-n");        // { ok: false, reason: "reserved" }
check("paytm-support");    // { ok: false, reason: "brand" }
check("g00gle-store");     // { ok: false, reason: "brand" }
check("sh1t-store");       // { ok: false, reason: "abusive" }
check("chut-shop");        // { ok: false, reason: "abusive" }
check("scam-alert");       // { ok: false, reason: "scam" }
check("assam-silk");       // { ok: true }
check("mail-order-store"); // { ok: true }
```

Just want a boolean?

```ts
import { isAllowed } from "nameguard";

isAllowed("demostore"); // true
isAllowed("admin");     // false
```

## Signup form

```ts
app.post("/stores", (req, res) => {
  const result = check(req.body.slug);
  if (!result.ok) {
    return res.status(400).json({ error: "That name isn't available." });
  }
  // create the store
});
```

Send users one generic message. Log `result.reason` yourself.

## Choose what to filter

```ts
check("paytm", { categories: ["brand"] });                 // only brands
check("fuck-you", { categories: ["brand", "reserved"] });  // { ok: true }
check("chutiya", { languages: ["en"] });                   // { ok: true }
check("chutiya", { languages: ["hi-latn"] });              // { ok: false, reason: "abusive" }
```

## Match level

```ts
check("razorpai");                       // { ok: true }
check("razorpai", { level: "strict" });  // { ok: false, reason: "brand" }
check("fuuuck", { level: "strict" });    // { ok: false, reason: "abusive" }
```

`exact`, `normal` (default), `strict`, `paranoid`. Higher catches more, and also blocks more innocent names.

Different level per category:

```ts
createGuard({ level: { default: "normal", brand: "strict" } });
```

## Your own words

```ts
check("merchantly", { block: ["merchantly"] });                           // { ok: false, reason: "blocked" }
check("my-merchantly-shop", { block: ["merchantly"] });                   // { ok: false, reason: "blocked" }
check("merchantlyshop", { block: [{ word: "merchantly", mode: "contains" }] }); // { ok: false, reason: "blocked" }
check("paytm", { allow: ["paytm"] });                                     // { ok: true }
```

## Usernames

```ts
check("john.doe", { profile: "username" });  // { ok: true }
check("john.doe");                           // { ok: false, reason: "invalid_format" }
```

## Reuse a guard

```ts
import { createGuard } from "nameguard";

const guard = createGuard({ level: "strict", categories: ["reserved", "brand"] });

guard.check("my-store");
guard.isAllowed("my-store");
```

## Debugging

```ts
import { explain } from "nameguard";

explain("a-d-m-i-n");
// { ok: false, reason: "reserved",
//   match: { word: "admin", category: "reserved", confidence: "normalized" } }
```

Server side only. Never show this to users.

## Options

| option | values | default |
| --- | --- | --- |
| `categories` | `reserved` `brand` `scam` `abuse` | all |
| `languages` | `en` `hi-latn` | all |
| `level` | `exact` `normal` `strict` `paranoid` | `normal` |
| `profile` | `slug` `username` | `slug` |
| `allow` | names to always allow | none |
| `block` | words to block | none |

More details, the word list and issues: [github.com/SyedEhsan06/nameguard](https://github.com/SyedEhsan06/nameguard)

MIT
