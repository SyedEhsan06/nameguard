# nameguard

Check if a name is okay to use as a store slug, subdomain or username.

It blocks reserved names, brands, abusive words (English and Hinglish) and scam terms. No dependencies.

## Install

```sh
npm install nameguard
```

## Use

```ts
import { check } from "nameguard";

check("demostore");      // { ok: true }
check("adm1n");          // { ok: false, reason: "reserved" }
check("paytm-support");  // { ok: false, reason: "brand" }
check("sh1t-store");     // { ok: false, reason: "abusive" }
check("chut-shop");      // { ok: false, reason: "abusive" }
check("scam-alert");     // { ok: false, reason: "scam" }
check("assam-silk");     // { ok: true }
```

Tricks like `a-d-m-i-n` and `adm1n` are caught. Innocent names like `assam-silk` pass.

The reason is one of `reserved`, `brand`, `abusive`, `scam`, `blocked`, `too_short`, `too_long` or `invalid_format`. Show users a plain "That name isn't available" and keep the reason for your logs.

## Options

```ts
check("paytm", { categories: ["brand"] });        // only check brands
check("chutiya", { languages: ["en"] });          // English only
check("razorpai", { level: "strict" });           // also catch typos
check("merchantly", { block: ["merchantly"] });   // add your own words
check("paytm", { allow: ["paytm"] });             // always allow
check("john.doe", { profile: "username" });       // username rules
```

| option | values | default |
| --- | --- | --- |
| `categories` | `reserved` `brand` `scam` `abuse` | all |
| `languages` | `en` `hi-latn` | all |
| `level` | `exact` `normal` `strict` `paranoid` | `normal` |
| `profile` | `slug` `username` | `slug` |
| `allow` | list of names | none |
| `block` | list of words | none |

Higher levels catch more tricks and typos, and also block more innocent names. `normal` is a good default.

If you check many names, build a guard once and reuse it:

```ts
import { createGuard } from "nameguard";

const guard = createGuard({ level: "strict" });
guard.check("my-store");
```

More details, the word list and issues: [github.com/SyedEhsan06/nameguard](https://github.com/SyedEhsan06/nameguard)

## License

MIT
