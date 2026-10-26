# Security

## Reporting

Report suspected vulnerabilities privately to the repository owner (GitHub security advisory or the contact listed on the owner’s GitHub profile). Do not open public issues for credential leaks or exploitable flaws before mitigation.

## Scope notes

- Do not upload proprietary BIOS, commercial ROMs, or production secrets to issues, PRs, or CI logs.
- Private asset backups and `.private-runtime/` must stay offline / out of public remotes.
- History rewriting does not revoke leaked credentials — rotate secrets immediately if exposure is discovered.
