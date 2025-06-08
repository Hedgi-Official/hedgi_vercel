{pkgs}: {
  deps = [
    pkgs.sqlite
    pkgs.jq
    pkgs.psmisc
    pkgs.libxcrypt
    pkgs.postgresql
  ];
}
