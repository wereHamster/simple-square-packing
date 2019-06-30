workflow "Main" {
  on = "push"
  resolves = ["TypeScript"]
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
