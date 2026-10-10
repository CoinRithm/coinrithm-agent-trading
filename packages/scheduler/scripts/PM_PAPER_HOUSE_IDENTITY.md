# New PM paper house identity

`seedPmPaperHouseIdentity.mjs` is an operator-only, create-only utility. It is
not imported by the scheduler or run at deployment. It creates one new PM-only
house from an explicitly supplied, hosted-validated agent bundle. No existing
house is eligible: handles must start with `pm-v2-`, and any pre-existing user or
unrecognized handle is a conflict.

After building the scheduler, provide a JSON config with exactly `handle`,
`displayName`, `agentPublic` (explicit boolean), and `target` containing
`database`, `systemIdentifier` (decimal string) and `serverVersionNum` (exact
Postgres 17 version integer). Obtain target values through the reviewed
read-only operator preflight. The default command has no database connection:

```sh
node scripts/seedPmPaperHouseIdentity.mjs --config plan-input.json --agent path/to/bundle
```

Review the complete plan and its `planHash`. The explicit commit command adds
`--commit --expected-plan-sha <planHash>`, with `OPERATOR_DATABASE_URL` and
`ENCRYPTION_KEY` supplied in memory by the existing secret mechanism. Neither
runtime role is accepted. Do not configure the operator connection on an app.
The utility checks exact database/system/version and cash coin 825/USDT before
writing; the operation performs no DDL.

One transaction creates a new active API identity with a reserved `.invalid`
email, an invalid bcrypt password marker and no OAuth account; a checksum-valid
read + trade:pm key; a dedicated `mock_spot` wallet and 50,000 paper mUSD in its
825 cash asset; and a paused, `live=false`, PM-only house and fresh state. The
raw key exists only in memory: the API stores its hash, and the agent stores an
AES-GCM envelope. The result contains only identity IDs and the plan hash.
Reserved email plus invalid password prevents the ordinary password/email
recovery/OAuth login paths; this is not protection against a privileged operator
later changing that identity.

The agent manifest stores the provisioning receipt. An exact repeat verifies
ownership, definition, wallet/asset identity and the encrypted key, without
resetting state, reactivating a key/agent, changing balances or topping up cash.
Definition or identity drift fails; no repair or upsert is attempted. A revoked
key remains revoked. After an ambiguous COMMIT result, do not blindly retry with
a new plan: reconcile with the same reviewed plan, which can return the existing
receipt. No raw database error or key is printed.

Before any production use, verify the existing-house seed roster guard has shipped;
its broad historical revival behavior must not reactivate this new paused house.
The isolated proof also does not replace the final live parent catalog attestation.

Provisioning does **not** apply API house tuples, scheduler PM policies or flags.
The newly returned identity must undergo a separate reviewed enrollment with
entry disabled, followed by explicit activation (including `live=true` and
active status). Do not enroll an existing house or remove a PM policy while its
agent is active: removal selects the legacy runner. Keep the PM drain worker on
while durable claims exist. Starting cash is nominal paper mUSD; it is not a
conversion of a venue collateral asset.
