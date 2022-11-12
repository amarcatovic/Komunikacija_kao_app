using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace Komunikacija_kao_app.Hubs
{
    public class WebRTCHub : Hub
    {
        private static RoomManager roomManager = new RoomManager();

        public override Task OnConnectedAsync()
        {
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            return base.OnDisconnectedAsync(exception);
        }

        public async Task CreateRoom(string name)
        {
            RoomInfo roomInfo = roomManager.CreateRoom(Context.ConnectionId, name);
            if (roomInfo != null)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, roomInfo.RoomId);
                await Clients.Caller.SendAsync("created", roomInfo.RoomId);
            }
            else
            {
                await Clients.Caller.SendAsync("error", "Greška prilikom pravljenja sobe.");
            }
        }

        public async Task Join(string roomId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
            await Clients.Caller.SendAsync("joined", roomId);
            await Clients.Group(roomId).SendAsync("ready");

            if (int.TryParse(roomId, out int id))
            {
                roomManager.DeleteRoom(id);
            }
        }

        // TODO Vedad: Leave Room metoda

        // TODO Vedad: Delete Room metoda

        // TODO Amar: Napraviti neku dodatnu "originalnu" funkcijonalnost
    }
}

public class RoomManager
{
    private int nextRoomId;
    private ConcurrentDictionary<int, RoomInfo> rooms;

    public RoomManager()
    {
        nextRoomId = 1;
        rooms = new ConcurrentDictionary<int, RoomInfo>();
    }

    public RoomInfo CreateRoom(string connectionId, string name)
    {
        rooms.TryRemove(nextRoomId, out _);

        // ovo su ti informacije za pravljenje nove sobe
        var roomInfo = new RoomInfo
        {
            RoomId = nextRoomId.ToString(),
            Name = name,
            HostConnectionId = connectionId
        };
        bool result = rooms.TryAdd(nextRoomId, roomInfo);

        // ako uspije dodati vraća room info inače ništa
        if (result)
        {
            ++nextRoomId;
            return roomInfo;
        }

        return null;
    }

    public void DeleteRoom(int roomId)
    {
        rooms.TryRemove(roomId, out _);
    }

    public void DeleteRoom(string connectionId)
    {
        int? correspondingRoomId = null;
        foreach (var pair in rooms)
        {
            if (pair.Value.HostConnectionId.Equals(connectionId))
            {
                correspondingRoomId = pair.Key;
            }
        }

        if (correspondingRoomId.HasValue)
        {
            rooms.TryRemove(correspondingRoomId.Value, out _);
        }
    }

    public List<RoomInfo> GetAllRoomInfo()
    {
        return rooms
            .Values
            .ToList();
    }
}

public class RoomInfo
{
    public string RoomId { get; set; }
    public string Name { get; set; }
    public string HostConnectionId { get; set; }
}
