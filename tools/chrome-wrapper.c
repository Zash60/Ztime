// Wrapper for the MCP-managed Chromium in root containers without a
// namespace sandbox (e.g. proot). Rewrites --user-data-dir to /tmp and
// injects --no-sandbox, then execs the real Chromium.
//
// Rebuild + reinstall (needs gcc, run once; survives restarts in /opt):
//   gcc -O2 -o /opt/google/chrome/chrome tools/chrome-wrapper.c
//   chmod 0755 /opt/google/chrome/chrome
// Requires the real binary at /opt/chrome-linux-arm64/chrome
// (Playwright cache copy:
//   cp -r ~/.cache/ms-playwright/chromium-*/chrome-linux-arm64 /opt/chrome-linux-arm64)
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define REAL_CHROME "/opt/chrome-linux-arm64/chrome"
#define PROFILE_DIR "/tmp/mcp-profile"

int main(int argc, char **argv) {
  setenv("HOME", "/tmp", 1);
  setenv("TMPDIR", "/tmp", 1);

  int hasNoSandbox = 0;
  for (int i = 1; i < argc; i++) {
    if (strncmp(argv[i], "--user-data-dir=", 17) == 0) {
      argv[i] = "--user-data-dir=" PROFILE_DIR;
    }
    if (strcmp(argv[i], "--no-sandbox") == 0) hasNoSandbox = 1;
  }

  char **args = argv;
  if (!hasNoSandbox) {
    args = malloc(sizeof(char *) * (argc + 3));
    for (int i = 0; i < argc; i++) args[i] = argv[i];
    args[argc] = "--no-sandbox";
    args[argc + 1] = "--disable-setuid-sandbox";
    args[argc + 2] = NULL;
  }
  execv(REAL_CHROME, args);
  perror("execv");
  return 1;
}
