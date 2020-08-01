# PersonatorBot - prevent impersonation of Admins. <br>

> Currently wrote for a single Server, though that could be expanded.<br>
> Tested on windows, tho should run on any OS that supports node.js.<br>

![successful ban](https://github.com/MrCryptoT/PersonatorBot/blob/master/img/cmd_ban_banned.png)

This Bot has  2 main goals: 
1) Prevent impersonation of members of chosen Roles (f.E moderators/trusted traders groups)
2) Allow manual Ban for usertags or UserIDs via command <br>( accessible to those protected roles . even if that user was never on the server the user gets banned) <br>
2.1) If above command is used by a non protected member it serves as a notify function (printing out the ID to potentially ban and tagging a Role if config allows it) <br>

![unauthd](https://github.com/MrCryptoT/PersonatorBot/blob/master/img/cmd_ban_unauthed_user.png)

## Install Dependencies: 
### Windows
```Install Node.js for your OS```<br>
```git clone https://github.com/MrCryptoT/PersonatorBot.git .```<br>
```cd PersonatorBot```<br>
```npm install winston```<br>
```npm install Woor/discord.io#gateway_v6```<br>

## Configuration
1) Supply your Auth token in auth.json
2) Replace the Varaibles in the bot.js and supply ServerID to protect users on

## Run the Bot
```node bot.js```


## Screenshots: 
```!ban help``` <br>
![help](https://github.com/MrCryptoT/PersonatorBot/blob/master/img/cmd_help_Output.png)
