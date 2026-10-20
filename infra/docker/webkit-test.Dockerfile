# Reproducible Playwright WebKit runner — do not install host ICU/webp packages.
# Build: docker build -f infra/docker/webkit-test.Dockerfile -t retro-webkit-test .
# Run:   docker run --rm --network host -v "$PWD:/work" -w /work/apps/web retro-webkit-test \
#          node tests/browser-matrix-smoke.cjs
FROM mcr.microsoft.com/playwright:v1.56.1-jammy
WORKDIR /work
ENV RETRO_TEST_BASE_URL=http://127.0.0.1:13000
# Host Compose web is published on the host network.
CMD ["node", "tests/browser-matrix-smoke.cjs"]
