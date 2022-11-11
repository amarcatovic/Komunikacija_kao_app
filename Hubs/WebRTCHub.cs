using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace Komunikacija_kao_app.Hubs
{
    public class WebRTCHub : Hub
    {
        public override Task OnConnectedAsync()
        {
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            return base.OnDisconnectedAsync(exception);
        }

        // TODO Amar: Napraviti upravljačku klasu za sobe s interfejsom koji će Vedad implementirati, te dodavanje pomoćnih klasa

        // TODO Vedad: Create Room metoda

        // TODO Vedad: Join Room metoda

        // TODO Vedad: Leave Room metoda

        // TODO Vedad: Delete Room metoda

        // TODO Amar: Napraviti neku dodatnu "originalnu" funkcijonalnost
    }
}
