# nameguard

Checks whether a name is okay to hand out as a store slug, subdomain or username. It blocks names your platform keeps for itself, brand lookalikes, abusive words in English and Hinglish, and scam terms. No dependencies, works in Node and in the browser.

I wrote it for a multi-tenant store platform where merchants pick `their-name.example.in`, but nothing in it is specific to domains.

## Install

```sh
npm install nameguard
```

## Quick start

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

Input is case insensitive. Hyphen tricks, swapped digits and trailing digits are caught, and innocent names that happen to contain a bad word pass.

## In a signup form

```ts
const result = check(slug);
if (!result.ok) {
  showError("That name isn't available.");
}
```

Show people one generic message and keep `result.reason` for your logs. Telling them which rule they hit makes the list easy to map.

## The result

`check` returns `{ ok: true }` or `{ ok: false, reason }`. The reason is one of:

| reason | meaning |
| --- | --- |
| `too_short`, `too_long`, `invalid_format` | not a valid name for the profile |
| `reserved` | a name the platform keeps for itself |
| `brand` | looks like a brand or bank |
| `abusive` | contains an abusive word |
| `scam` | contains a scam term |
| `blocked` | matched a word you added with `block` |

The matched word is never part of this result. For debugging on the server there is `explain`, which also returns the word, its category and how it matched:

```ts
import { explain } from "nameguard";

explain("a-d-m-i-n");
// { ok: false, reason: "reserved",
//   match: { word: "admin", category: "reserved", language: "any", confidence: "normalized" } }
```

Keep `explain` output out of anything a user can see.

## Options

Every option is optional. Pass them as the second argument to `check`, or build a guard once and reuse it:

```ts
import { createGuard } from "nameguard";

const guard = createGuard({
  profile: "username",
  categories: ["reserved", "brand"],
  level: "strict",
});

guard.check("john.doe");
```

| option | default | what it does |
| --- | --- | --- |
| `profile` | `"slug"` | `"slug"`: 3 to 63 characters of `a-z 0-9 -`. `"username"`: 3 to 30 characters, also allows `.` and `_` |
| `categories` | all | any of `"reserved"`, `"brand"`, `"scam"`, `"abuse"` |
| `languages` | all | `"en"`, `"hi-latn"` (Hinglish, Hindi in Latin letters) |
| `level` | `"normal"` | how close a name must be to a listed word, see below |
| `allow` | none | names or words that always pass |
| `block` | none | extra words to block: a string, or `{ word, mode }` where mode is `"exact"`, `"part"` or `"contains"` |
| `words` | built in | replace the whole word list with your own |

```ts
check("fuck-you", { categories: ["brand"] });   // { ok: true }, abuse is switched off
check("chutiya", { languages: ["en"] });        // { ok: true }, Hinglish is switched off
check("razorpai", { level: "strict" });         // { ok: false, reason: "brand" }
check("merchantly", { block: ["merchantly"] }); // { ok: false, reason: "blocked" }
check("paytm", { allow: ["paytm"] });           // { ok: true }
check("john.doe", { profile: "username" });     // { ok: true }
```

A name that is in both `allow` and `block` throws when the guard is created.

### Levels

| level | catches |
| --- | --- |
| `"exact"` | the name is literally a listed word |
| `"normal"` | also hyphen tricks (`a-d-m-i-n`), swapped digits (`adm1n`) and trailing digits (`admin2`) |
| `"strict"` | also repeated letters (`fuuuck`) and one typo in brands and reserved names (`razorpai`) |
| `"paranoid"` | also two typos, typos in every category and words buried inside longer names |

`"normal"` is the default. `"strict"` and `"paranoid"` block more innocent names, so use them where a false positive is cheap. You can set a level per category: `level: { default: "normal", brand: "strict" }`.

## How matching works

Each word in the list says how it should be matched:

- `exact`: the whole name has to equal the word. Used for reserved names, so `mail-order-store` and `root-vegetables` are fine even though `mail` and `root` are reserved.
- `part`: one hyphen separated piece has to equal the word. `scam-alert` is blocked, `scampi` is not.
- `contains`: the word can appear anywhere. Only used for long words that do not show up in innocent names, such as `razorpay`.

That is how the classic Scunthorpe problem is avoided: `class`, `assam-silk`, `cockatoo` and `gandhi-store` pass because short abusive words are only matched as whole pieces. A built in `safe` list covers the few `contains` words that could still hit an innocent word.

## What it does not do

- It is not moderation. It checks identifiers, not sentences, and has no idea about context.
- It does not know whether a name is taken. Keep a unique constraint on the lowercased slug in your database and use this as a fast check in front of it.
- It will not catch everything. A name that passes can still turn out to be a phishing page, so keep a report and takedown path.
- It checks when a name is created. It does not go back over existing names when the list changes.

## Word list

About 800 entries across English and Hinglish today, in [`data/words.json`](https://github.com/SyedEhsan06/nameguard/blob/main/data/words.json). It is a starting point and has not been reviewed by many native speakers yet. If you find a miss or a false positive, open an issue or a pull request and add a case to [`data/testcases.json`](https://github.com/SyedEhsan06/nameguard/blob/main/data/testcases.json).

A check takes roughly 1 to 3 microseconds at the default level, and list size barely changes that. Build a guard once at startup rather than per request.

Source and issues: [github.com/SyedEhsan06/nameguard](https://github.com/SyedEhsan06/nameguard)

## License

MIT
