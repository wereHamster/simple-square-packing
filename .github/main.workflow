workflow "Main" {
  on = "push"
  resolves = ["TypeScript", "Rollup"]
}

action "Install" {
  uses = "actions/npm@master"
  args = "ci"
}

action "TypeScript" {
  needs = "Install"
  uses = "docker://node"
  args = "./node_modules/.bin/tsc"
}

action "Rollup" {
  needs = ["Install", "TypeScript"]
  uses = "docker://node"
  args = "./node_modules/.bin/rollup -c"
}