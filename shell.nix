let
  pkgs = import <nixpkgs> {};

in pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs-13_x
  ];
}
