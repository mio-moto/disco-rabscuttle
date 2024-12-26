#/bin/sh


FONTCONFIG_PATH=/software/data/fonts/
NO_COLOR=1
cd /software
bun install
bunx biome check --write --colors=off
bun --watch src/index.ts