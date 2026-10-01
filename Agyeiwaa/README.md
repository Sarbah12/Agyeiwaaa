# For Agyeiwaa, With Love

A white-background birthday experience from Ebenezer. Open `index.html` directly in a browser. No install, build, or server is needed.

The five steps include an envelope, revealable notes, a birthday cake, a personal letter, and a closing celebration. Birthday music is off until selected. The microphone is optional, starts only on request, and stops when the candle goes out, the user cancels, the page loses focus, or the user changes steps. The candle button is always available as a fallback. The letter can be downloaded as a text file.

## Vercel

Deploy this directory with Vercel's framework preset set to **Other**, no build command, and output directory `.`. `vercel.json` already supplies these settings. The standard `index.html` entry opens at `/`.

From this directory, with the Vercel CLI installed and signed in:

```sh
vercel --prod
```

CLI reference: https://vercel.com/docs/cli/deploy

The local preview `Happy Birthday, Agyeiwaa.html` and `index.html` have the same content. Keep the two files in sync if changing their HTML. Shared styling and behavior are in `assets/birthday.css` and `assets/birthday.js`.

## Assets

- `assets/agyeiwaa.jpg`: birthday photo already added to the project.
- `assets/birthday-character.jpg`: supplied birthday illustration.
- `assets/pink-birthday-cake.png`: custom cake generated with the built-in image tool. Prompt recorded in `assets/asset-notes.md`.
- `assets/lucide.min.js`: local Lucide icons. License in `assets/lucide-LICENSE.txt`.

The page uses Google Fonts for Allura, Cormorant Garamond, and DM Sans, with system fallbacks.
