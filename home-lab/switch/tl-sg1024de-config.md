# TP-Link TL-SG1024DE — home-lab switch config

Live snapshot pulled from the switch web UI on **2026-10-29** (read back after configuration).
Replaces the Dell N4032 (offline since 2026-10-29). Summary row lives in
[`topology/home-lab.md`](../../topology/home-lab.md).

## Device

| Item | Value |
|---|---|
| Model / HW | TL-SG1024DE / 7.0 (Easy Smart, 24× 1GbE, no SFP) |
| Firmware | 1.0.0 Build 20230616 Rel.34205 |
| MAC | `B8:FB:B3:5E:0F:80` |
| Device description | `TL-SG1024DE` |
| Management | Web UI only — `http://10.0.0.254` (no SSH / CLI / SNMP) |
| Credentials | Not stored here — see secrets tool |

## IP setting (System → IP Setting)

| Item | Value |
|---|---|
| DHCP client | **Disabled** |
| IP | `10.0.0.254` |
| Mask | `255.255.254.0` (/23) |
| Gateway | `10.0.0.1` |

> Factory default is `192.168.0.1/24`. With DHCP enabled on this LAN it took `10.0.0.16`.
> If the switch is unreachable: ping-sweep `10.0.0.0/23` then `arp -an | grep b8:fb:b3:5e:f:80`,
> or use TP-Link *Easy Smart Configuration Utility* (L2 discovery, IP-independent).

## 802.1Q VLAN (VLAN → 802.1Q VLAN) — **Enabled**

| VLAN | Name | Untagged ports | Tagged ports |
|---|---|---|---|
| 1 | Default | 1–24 | — |
| 2–30 | `VLAN2` … `VLAN30` | — | 7–24 |

- Member bitmaps: VLAN 1 untag `0xFFFFFF`; VLAN 2–30 tag `0xFFFFC0` (ports 7–24).
- Max 32 VLANs on this model → 2 slots left.

### Port role

| Ports | Mode | PVID | VLANs |
|---|---|---|---|
| 1–6 | access | 1 | 1 untagged |
| 7–24 | trunk | 1 | 1 untagged (native) + 2–30 tagged |

## Other features

| Feature | State |
|---|---|
| Port Setting | All 24 ports enabled, speed Auto, flow control Off |
| LAG (Port Trunk) | None configured (max 8 groups) |
| Port-based VLAN | Disabled |
| MTU VLAN | Disabled |
| IGMP Snooping | Enabled (default), report suppression off, no static groups |
| QoS / storm control / mirroring / loop prevention | Factory default (not touched) |
| Jumbo frames | No MTU knob — always on. **MTU 9000 verified 2026-10-29** (VDS7 VLAN 3–9, `.95` / `.97` → router gateway, 8972 B + DF 3/3) |

Links up at snapshot time (1000M full): ports 1, 3, 4, 11, 17. `.98` was power-cycled during the
swap (boot 20:18), so port 18 came up afterwards; port 3 → 9 move happened at 21:00.

## Host ↔ port map

Found 2026-10-29 20:28 by comparing per-port packet counters (`PortStatisticsRpm.htm`) against
vmnic counters over 60 s; port 9 updated after the 21:00 re-cable; VDS uplink assignment
cross-checked in vCenter at 21:13.

| Port | Mode | Host / NIC | vSphere side |
|---|---|---|---|
| 1 | access | upstream link → another switch / home LAN (router `10.0.0.1`) | `.97` vmnic0 and `.98` vmnic2 live on that side (their counters don't match any port here) |
| 4 | access | `.95` vmnic2 | vSwitch0 — `.95` management (vmk0) |
| 9 | trunk | `.95` vmnic1 | VDS7 Uplink 2 |
| 11 | trunk | `.95` vmnic0 | VDS7 Uplink 1 |
| 17 | trunk | `.97` vmnic2 | VDS7 Uplink 1 |
| 18 | trunk | `.98` vmnic0 | VDS7 Uplink 1 (outer vCenter, RouterOS lab router trunk) |

## Known gaps

- **1 GbE only** — `.95` / `.97` 10G X540 NICs run at 1000 here.
- VDS7 portgroups `VLAN31-pf` … `VLAN36-pf` (VLAN 31–36) have **no matching VLAN on this switch**
  (VLANs 1–30 only; 2 of 32 VLAN slots left). Add them (or drop the PGs) before using them.

## Reading state without the browser

The web UI is plain HTTP and session-bound to the client IP: `POST /logon.cgi`
(`username`, `password`, `cpassword=`, `logon=Login`), then GET
`/SystemInfoRpm.htm`, `/PortSettingRpm.htm`, `/PortStatisticsRpm.htm`
(`pkts`: 4 values per port — txGood, txBad, rxGood, rxBad), `/Vlan8021QRpm.htm`
(`tagMbrs` / `untagMbrs` bitmasks, bit 0 = port 1) and `/Vlan8021QPvidRpm.htm`.
From Git Bash set `MSYS_NO_PATHCONV=1`.

## Rebuild procedure

Changes are written to flash on Apply (no separate save). Backup/restore of the binary
config is under System → System Tools → Backup and Restore — **do not commit the `.cfg`
to this public repo** (contains credentials).

To rebuild from factory default, log in to the web UI first (Easy Smart authorises by
client IP), then run in the browser devtools console on the switch page:

```js
// 1) enable 802.1Q (creates VLAN 1, all ports untagged)
await fetch('/qvlanSet.cgi?qvlan_en=1&qvlan_mode=Apply');
// 2) VLAN 2–30: ports 1–6 not member (2), ports 7–24 tagged (1); 0 = untagged
for (let v = 2; v <= 30; v++) {
  const p = new URLSearchParams({ vid: String(v), vname: 'VLAN' + v });
  for (let i = 1; i <= 24; i++) p.append('selType_' + i, i <= 6 ? '2' : '1');
  p.append('qvlan_add', 'Add/Modify');
  await fetch('/qvlanSet.cgi?' + p);
}
// 3) static mgmt IP (do this last — the session moves to the new IP)
fetch('/ip_setting.cgi?dhcpSetting=disable&ip_address=10.0.0.254&ip_netmask=255.255.254.0&ip_gateway=10.0.0.1');
```

Verify: `Vlan8021QRpm.htm` → `qvlan_ds` should show `count:30`, VLAN 2–30 `tagMbrs:0xFFFFC0`.
