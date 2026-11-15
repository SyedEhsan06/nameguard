# nameguard

Checks whether a name is okay to hand out as a store slug, subdomain or username.

It blocks four kinds of names:

- names your platform needs for itself (`admin`, `api`, `www`, `support`, `redis`)
- names that imitate a brand (`paytm-support`, `razorpay`, `hdfc-bank`)
- abusive words, in English and Hinglish
- scam terms (`scam`, `phishing`, `counterfeit`)

I wrote it for a multi-tenant store platform where merchants pick `their-name.example.in`, but nothing in it is specific to domains. Zero dependencies, works in Node and in the browser.

```ts
import { check } from "nameguard";

check("demostore");       // { ok: true }
check("adm1n");           // { ok: false, reason: "reserved" }
check("a-d-m-i-n");       // { ok: false, reason: "reserved" }
check("paytm-support");   // { ok: false, reason: "brand" }
check("sh1t-store");      // { ok: false, reason: "abusive" }
check("assam-silk");      // { ok: true }
check("mail-order-store"); // { ok: true }
```

You choose what to filter, and how close a name has to be to a listed word:

```ts
check("fuck-you", { categories: ["brand"] });   // { ok: true }, abuse is switched off
check("paytm", { categories: ["brand"] });      // { ok: false, reason: "brand" }
check("chutiya", { languages: ["en"] });        // { ok: true }, Hinglish is switched off
check("razorpai");                              // { ok: true }
check("razorpai", { level: "strict" });         // { ok: false, reason: "brand" }
check("ehsan", { block: ["ehsan"] }); // { ok: false, reason: "blocked" }
check("paytm", { allow: ["paytm"] });           // { ok: true }
```

All the options are listed under [Options](#options).

## Install

```sh
npm install nameguard
```

A Go version that shares the same word list and test cases is planned.

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

The matched word is never in this result, so it is safe to send to a client. Telling people exactly which word tripped the filter makes it easy to map your list, so show one generic "that name isn't available" message and keep the reason for your logs.

For debugging there is `explain`, which also returns the word, its category and how it matched. Keep that on the server.

```ts
import { explain } from "nameguard";

explain("a-d-m-i-n");
// { ok: false, reason: "reserved",
//   match: { word: "admin", category: "reserved", language: "any", confidence: "normalized" } }
```

## Options

Everything has a default, so `check(name)` works as is. To change anything, pass options or build a guard once and reuse it:

```ts
import { createGuard } from "nameguard";

const guard = createGuard({
  profile: "username",
  categories: ["reserved", "brand"],
  languages: ["en"],
  level: "strict",
  allow: ["paytmlabs"],
  block: ["merchantly"],
});

guard.check("john.doe");
```

| option | default | what it does |
| --- | --- | --- |
| `profile` | `"slug"` | `slug` is 3 to 63 characters of `a-z 0-9 -`. `username` is 3 to 30 characters and also allows `.` and `_`. |
| `categories` | all | any of `reserved`, `brand`, `scam`, `abuse` |
| `languages` | all | `en`, `hi-latn` (Hinglish, Hindi in Latin letters) |
| `level` | `"normal"` | how close a name has to be to a listed word, see below |
| `allow` | none | names or words that should always pass |
| `block` | none | extra words to block. A string matches as a whole hyphen separated part. Use `{ word, mode }` for `exact` or `contains`. |
| `words` | built in | replace the whole list with your own |

`level` can also be set per category: `level: { default: "normal", brand: "strict" }`.

Input is case insensitive. Anything outside the profile's characters is `invalid_format`, which is what stops lookalike Unicode letters from ever reaching the matcher.

### Levels

| level | what it catches |
| --- | --- |
| `exact` | the name is literally a listed word |
| `normal` | also hyphen tricks (`a-d-m-i-n`), leetspeak (`adm1n`, `g00gle`) and trailing digits (`admin2`) |
| `strict` | also repeated letters (`fuuuck`, `paytmm`) and one typo in brands and reserved names (`razorpai`) |
| `paranoid` | also two typos, typos in every category, and matches buried inside longer names |

`normal` is the default. `strict` and `paranoid` will block more innocent names, so turn them on where a false positive is cheap.

## How matching works

A single rule does not work for everything, so each word in `data/words.json` says how it should be matched:

- `exact`: the whole name has to equal the word. Used for reserved names, so `mail-order-store` and `root-vegetables` are fine even though `mail` and `root` are reserved.
- `part`: one hyphen separated piece has to equal the word. `scam-alert` is blocked, `scampi` is not.
- `contains`: the word can appear anywhere. Only used for long words that do not show up in innocent names, such as `razorpay`.

This is how the classic Scunthorpe problem is avoided. `class`, `assam-silk`, `cockatoo`, `gandhi-store` and `chutney-house` all pass because short abusive words are only matched as whole pieces. For the few `contains` words there is a `safe` list (`snigger`, `retardant`, `brandish` and so on) that overrides a hit.

Names are checked in a few forms: as written, with hyphens removed, with digits swapped for letters (`0 o`, `1 i`, `3 e`, `4 a`, `5 s`, `7 t`, and `1 l` too), and with trailing digits dropped.

## What it does not do

- It is not moderation. It checks identifiers, not sentences, and it has no idea about context.
- It does not know if a name is taken. Put a unique constraint on the lowercased slug in your database and treat this as a fast check in front of it.
- It will not catch everything. A name that passes can still turn out to be a phishing page, so keep a report and takedown path.
- Checks run when a name is created. It does not go back and look at existing names when the list changes.

## Word list

The list lives in [`data/words.json`](data/words.json), about 800 entries today across English and Hinglish. It is a starting point and it is not reviewed by a large group of native speakers yet. If you find a miss or a false positive, open an issue or a pull request, and add a case to [`data/testcases.json`](data/testcases.json) with it.

Each entry looks like this:

```json
{ "w": "razorpay", "c": "brand", "l": "any", "m": "contains" }
```

`c` is the category, `l` the language and `m` the match mode. The list has its own version (`listVersion` on a guard) separate from the package version.

## Speed

On an M series laptop a check takes roughly 1 to 3 microseconds at the default level. Exact and part matches are hash lookups, `contains` words go through an Aho-Corasick automaton, and typo matching uses a deletion index, so list size barely changes check time. A 100,000 word list builds in about 20 ms. Build the guard once at startup rather than per request. To see numbers on your machine:

```sh
cd ts
npm run bench:scale
```

## Development

```sh
cd ts
npm install
npm test          # unit tests, shared test cases and fuzz tests
npm run typecheck
npm run build
```

`data/words.json` is the source of truth. After editing it run `node scripts/sync-data.mjs` to copy it into the package.

## License

MIT
