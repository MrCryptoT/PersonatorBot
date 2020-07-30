# PersonatorBot
Discordbot to prevent impersonation of Admins. 
Currently wrote for a single Server, though that could be expanded.
Tested on windows, tho should run on any OS that supports node.js.

##Install Dependencies: 
###Windows
Install Node
git clone https://github.com/MrCryptoT/PersonatorBot.git .
cd PersonatorBot
npm install winston
npm install Woor/discord.io#gateway_v6

##Configuration
1) Supply your Auth token in auth.json
2) Replace the Varaibles in the bot.js and supply ServerID to protect users on

##run the Bot
node bot.js
