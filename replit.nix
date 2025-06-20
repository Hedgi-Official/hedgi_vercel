{pkgs}: {
  deps = [
    pkgs.hyperfine
    pkgs.jq
    pkgs.psmisc
    pkgs.libxcrypt
    pkgs.postgresql
  ];
}
