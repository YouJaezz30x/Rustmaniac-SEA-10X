using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Oxide.Core;
using Oxide.Core.Libraries;
using Oxide.Core.Plugins;

namespace Oxide.Plugins
{
    [Info("Rustmaniac Store", "10x ASIA", "1.1.0")]
    [Description("Delivers VIP bought on the Rustmaniac website and sends live server status to it")]
    public class RustmaniacStore : RustPlugin
    {
        [PluginReference] private Plugin RustmaniacVIP;

        private PluginConfig _config;
        private StoredData _data;
        private readonly HashSet<string> _inFlight = new HashSet<string>();
        private bool _warned;

        private class PluginConfig
        {
            [JsonProperty("Website URL (for example https://rustmaniac-sea-10x.vercel.app)")] public string SiteUrl = "";
            [JsonProperty("Server API key (same as SERVER_API_KEY on the website)")] public string ApiKey = "";
            [JsonProperty("Check for new purchases every (seconds)")] public float DeliverySeconds = 30f;
            [JsonProperty("Send server status every (seconds)")] public float StatusSeconds = 60f;
            [JsonProperty("Sync Discord links from /link every (minutes)")] public float LinkMinutes = 10f;
            [JsonProperty("Force wipe hour (UTC)")] public int ForceWipeHourUtc = 19;
        }

        // Deliveries already granted in game. If the website didn't get our reply, we re-send it
        // instead of granting the VIP twice.
        private class StoredData
        {
            public Dictionary<string, string> Granted = new Dictionary<string, string>();
        }

        protected override void LoadDefaultConfig() => _config = new PluginConfig();

        protected override void LoadConfig()
        {
            base.LoadConfig();
            try { _config = Config.ReadObject<PluginConfig>() ?? new PluginConfig(); }
            catch { PrintError("Config was invalid, using defaults"); _config = new PluginConfig(); }
            SaveConfig();
        }

        protected override void SaveConfig() => Config.WriteObject(_config, true);

        private void SaveData() => Interface.Oxide.DataFileSystem.WriteObject(Name, _data);

        private void Init()
        {
            _data = Interface.Oxide.DataFileSystem.ReadObject<StoredData>(Name) ?? new StoredData();
        }

        private void OnServerInitialized()
        {
            timer.Every(Math.Max(10f, _config.DeliverySeconds), CheckDeliveries);
            timer.Every(Math.Max(30f, _config.StatusSeconds), SendStatus);
            timer.Every(Math.Max(1f, _config.LinkMinutes) * 60f, SyncLinks);
            timer.Once(5f, SendStatus);
            timer.Once(8f, CheckDeliveries);
            timer.Once(15f, SyncLinks);
        }

        private bool Ready()
        {
            if (!string.IsNullOrEmpty(_config.SiteUrl) && !string.IsNullOrEmpty(_config.ApiKey))
                return true;
            if (!_warned)
            {
                Puts("Idle: set the website URL and server API key in oxide/config/RustmaniacStore.json, then reload.");
                _warned = true;
            }
            return false;
        }

        private Dictionary<string, string> Headers() => new Dictionary<string, string>
        {
            ["Authorization"] = "Bearer " + _config.ApiKey,
            ["Content-Type"] = "application/json"
        };

        private string Url(string path) => _config.SiteUrl.TrimEnd('/') + path;

        #region Deliveries

        private void CheckDeliveries()
        {
            if (!Ready())
                return;
            webrequest.Enqueue(Url("/api/server/deliveries"), null, (code, body) =>
            {
                if (code != 200)
                {
                    if (code != 0) PrintWarning($"Website returned {code} when checking purchases");
                    return;
                }
                JArray list;
                try { list = JObject.Parse(body)["deliveries"] as JArray; }
                catch { return; }
                if (list == null)
                    return;
                foreach (var entry in list)
                    Deliver((string)entry["id"], (string)entry["steamId"], (string)entry["tier"], entry["days"]?.Type == JTokenType.Integer ? (int?)entry["days"] : null);
            }, this, RequestMethod.GET, Headers(), 20f);
        }

        private void Deliver(string id, string steamId, string tier, int? days)
        {
            if (string.IsNullOrEmpty(id) || _inFlight.Contains(id))
                return;

            if (_data.Granted.TryGetValue(id, out var previous))
            {
                Report(id, true, previous);
                return;
            }

            if (RustmaniacVIP == null || !RustmaniacVIP.IsLoaded)
            {
                PrintWarning("RustmaniacVIP is not loaded, VIP purchases will wait until it is.");
                return;
            }
            if (string.IsNullOrEmpty(steamId) || steamId.Length != 17 || !ulong.TryParse(steamId, out _))
            {
                Report(id, false, "Invalid Steam ID " + steamId);
                return;
            }

            var args = days.HasValue
                ? new object[] { "give", steamId, tier, days.Value.ToString() }
                : new object[] { "give", steamId, tier };
            var reply = ConsoleSystem.Run(ConsoleSystem.Option.Server.Quiet(), "vip", args) ?? "";
            var ok = reply.StartsWith("Gave") || reply.StartsWith("Extended");
            Puts($"Website purchase {id}: {reply}");

            if (ok)
            {
                _data.Granted[id] = reply;
                SaveData();
            }
            Report(id, ok, string.IsNullOrEmpty(reply) ? "No reply from the vip command" : reply);
        }

        private void Report(string id, bool ok, string result)
        {
            _inFlight.Add(id);
            var body = new JObject { ["ok"] = ok, ["result"] = result.Length > 480 ? result.Substring(0, 480) : result };
            webrequest.Enqueue(Url("/api/server/deliveries/" + id), body.ToString(Formatting.None), (code, res) =>
            {
                _inFlight.Remove(id);
                if (code == 200 || code == 404)
                {
                    if (_data.Granted.Remove(id))
                        SaveData();
                }
                else
                    PrintWarning($"Could not confirm purchase {id} with the website ({code}), will retry");
            }, this, RequestMethod.POST, Headers(), 20f);
        }

        #endregion

        #region Status

        private DateTime NextForceWipe()
        {
            var now = DateTime.UtcNow;
            for (var monthOffset = 0; monthOffset < 3; monthOffset++)
            {
                var month = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(monthOffset);
                var day = month;
                while (day.DayOfWeek != DayOfWeek.Thursday)
                    day = day.AddDays(1);
                var wipe = day.AddHours(_config.ForceWipeHourUtc);
                if (wipe > now)
                    return wipe;
            }
            return now;
        }

        private void SendStatus()
        {
            if (!Ready())
                return;
            var queue = SingletonComponent<ServerMgr>.Instance?.connectionQueue;
            var body = new JObject
            {
                ["hostname"] = ConVar.Server.hostname ?? "",
                ["online"] = BasePlayer.activePlayerList.Count,
                ["maxPlayers"] = ConVar.Server.maxplayers,
                ["sleepers"] = BasePlayer.sleepingPlayerList.Count,
                ["queued"] = queue?.Queued ?? 0,
                ["joining"] = queue?.Joining ?? 0,
                ["worldSize"] = (int)World.Size,
                ["seed"] = unchecked((int)World.Seed),
                ["wipedAt"] = SaveRestore.SaveCreatedTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                ["nextWipe"] = NextForceWipe().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            };
            webrequest.Enqueue(Url("/api/server/status"), body.ToString(Formatting.None), (code, res) =>
            {
                if (code != 200 && code != 0)
                    PrintWarning($"Website returned {code} for server status");
            }, this, RequestMethod.POST, Headers(), 20f);
        }

        #endregion

        #region Discord links

        // Last value sent per Steam ID, so only new or changed /link results are uploaded.
        private readonly Dictionary<string, string> _sentLinks = new Dictionary<string, string>();

        private void SyncLinks()
        {
            if (!Ready())
                return;
            JObject links;
            try { links = Interface.Oxide.DataFileSystem.ReadObject<JObject>("RustmaniacDiscord")?["Links"] as JObject; }
            catch { return; }
            if (links == null)
                return;

            var changed = new List<JObject>();
            foreach (var pair in links.Properties())
            {
                var discordId = (string)pair.Value["DiscordId"];
                if (string.IsNullOrEmpty(discordId))
                    continue;
                var discordName = (string)pair.Value["DiscordName"];
                var signature = discordId + "|" + discordName;
                if (_sentLinks.TryGetValue(pair.Name, out var sent) && sent == signature)
                    continue;
                changed.Add(new JObject { ["steamId"] = pair.Name, ["discordId"] = discordId, ["discordName"] = discordName });
            }

            for (var i = 0; i < changed.Count; i += 40)
            {
                var batch = changed.GetRange(i, Math.Min(40, changed.Count - i));
                var body = new JObject { ["links"] = new JArray(batch) };
                webrequest.Enqueue(Url("/api/server/links"), body.ToString(Formatting.None), (code, res) =>
                {
                    if (code != 200)
                    {
                        PrintWarning($"Website returned {code} when syncing Discord links, will retry");
                        return;
                    }
                    foreach (var link in batch)
                        _sentLinks[(string)link["steamId"]] = (string)link["discordId"] + "|" + (string)link["discordName"];
                }, this, RequestMethod.POST, Headers(), 30f);
            }
        }

        #endregion

        [ConsoleCommand("store.check")]
        private void CmdCheck(ConsoleSystem.Arg arg)
        {
            if (arg.Connection != null)
                return;
            _warned = false;
            SendStatus();
            CheckDeliveries();
            SyncLinks();
            arg.ReplyWith(Ready() ? "Checking the website for purchases and sending status..." : "Not configured yet, see oxide/config/RustmaniacStore.json");
        }
    }
}
