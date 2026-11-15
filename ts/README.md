# nameguard

Checks whether a name is okay to use as a store slug, subdomain or username. Blocks reserved names, brand lookalikes, abusive words (English and Hinglish) and scam terms. No dependencies.

```ts
import { check } from "nameguard";

check("demostore");   // { ok: true }
check("adm1n");       // { ok: false, reason: "reserved" }
```

Options, match levels, how matching works and the word list are documented in the [main README](https://github.com/SyedEhsan06/nameguard#readme).
