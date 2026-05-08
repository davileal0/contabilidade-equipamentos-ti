import { spawn } from "node:child_process";

const processes = [
  spawn("node", ["server.mjs", "--api-only"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, PORT: "3001" },
  }),
  spawn("npx", ["vite", "--host", "0.0.0.0"], {
    stdio: "inherit",
    shell: true,
  }),
];

const stopAll = () => {
  for (const child of processes) {
    child.kill();
  }
};

for (const child of processes) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      stopAll();
      process.exit(code);
    }
  });
}

process.on("SIGINT", () => {
  stopAll();
  process.exit(0);
});
