import assert from "node:assert/strict";
import {
  normalizeApprovalLogs,
  scoreApproval,
  topicAddress,
  type ExplorerApprovalLog,
} from "./approval-health.js";

const owner = "0x1111111111111111111111111111111111111111";
const token = "0x2222222222222222222222222222222222222222";
const spender = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";

const approvalTopic = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";
const maxUint = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

const logs: ExplorerApprovalLog[] = [
  {
    address: token,
    topics: [approvalTopic, topicAddress(owner), topicAddress(spender)],
    data: maxUint,
    blockNumber: "0x10",
    timeStamp: "0x66000000",
    transactionHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  {
    address: token,
    topics: [approvalTopic, topicAddress(owner), topicAddress(spender)],
    data: "0x0",
    blockNumber: "0x11",
    timeStamp: "0x66000001",
    transactionHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
];

const activeApprovals = normalizeApprovalLogs(logs, "mainnet", owner);

assert.equal(activeApprovals.length, 0, "latest zero-value approval should clear an active approval");
assert.match(topicAddress(owner), /^0x0{24}1111111111111111111111111111111111111111$/);

const scored = scoreApproval({
  token,
  spender,
  amount: BigInt(maxUint),
  blockNumber: 16n,
  transactionHash: logs[0].transactionHash,
  timestamp: "2024-03-24T16:16:00.000Z",
  network: "mainnet",
  wallet: owner,
});

assert.equal(scored.isUnlimited, true);
assert.equal(scored.riskLevel, "medium", "trusted unlimited approvals should be flagged without panic");
assert.equal(scored.spenderEntity?.name, "Uniswap V2 Router");
assert.ok(scored.revokeUrl.includes("chainId=1"));
