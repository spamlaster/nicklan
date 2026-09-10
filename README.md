# Nicklan

React, TypeScript, and Vite website for https://nicklan.com.

## Local development

Use Node.js 22. Install dependencies with `npm install`, then run `npm run dev`.
Run `npm run build` to produce `dist`, or `npm run preview` to preview the build.

## Deployment

`.github/workflows/deploy.yml` builds with `npm ci` and `npm run build`, then
uploads and deploys `dist` to GitHub Pages on pushes to `master`.

In GitHub Settings → Pages, set the deployment source to **GitHub Actions**
and verify the custom domain is **nicklan.com**. Vite uses `base: '/'`, and
`public/CNAME` is copied into the build output.

Do not commit dependencies, build output, environment files, or secrets.

## Previous website

The original Three.js website and its history are preserved on
`archive/threejs-site` at commit `3dcbb1baa1db3c0b726d9a92e13f0b864b0dacce`.
