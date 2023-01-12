const fs = require("fs");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
// Require the necessary discord.js classes
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const { db } = require("./utils/db.js");

const getWinners = async (projectId) => {
  const { data } = await db.from("Entry").select("discordUserId").match({
    projectId,
    winner: true,
  });

  return data?.map(({ discordUserId }) => discordUserId)?.filter(Boolean) || [];
};

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Loading commands from the commands folder
const commands = [];
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

// Loading the token from .env file
const dotenv = require("dotenv");
const envFILE = dotenv.config();
const TOKEN = process.env["TOKEN"];

// Edit your TEST_GUILD_ID here in the env file for development
const TEST_GUILD_ID = process.env["TEST_GUILD_ID"];

// Creating a collection for commands in client
client.commands = new Collection();

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
  client.commands.set(command.data.name, command);
}

// When the client is ready, run this code (only once)
client.once("ready", async () => {
  console.log("Ready!");
  // Registering the commands in the client
  const CLIENT_ID = client.user.id;
  const rest = new REST({
    version: "9",
  }).setToken(TOKEN);

  (async () => {
    /**
     * Send message to winners of the raffle
     */
    db.from("RaffleWinnerQueue")
      .on("*", async (payload) => {
        // Payload looks like:
        // {
        //   schema: 'public',
        //   table: 'RaffleWinnerQueue',
        //   commit_timestamp: '2022-10-08T20:04:19Z',
        //   eventType: 'INSERT',
        //   new: {
        //     createdAt: '2022-10-08T20:04:19.605+00:00',
        //     id: 7,
        //     projectId: 5,
        //     updatedAt: null
        //   },
        //   old: {},
        //   errors: null
        // }

        //console.log("Got payload: ", payload);

        try {
          const projectId = payload.new.projectId;

          // Get the channelId from the database from the projectId
          const { raffleChannelId, projectName } =
            (
              await db
                .from("Discord")
                .select("raffleChannelId, projectName")
                .match({ projectId })
                .single()
            )?.data || {};

          if (!raffleChannelId) {
            return console.log(
              `No channel id found for projectId ${projectId}!`
            );
          }

          console.log(
            `Got channelId: ${raffleChannelId} from project: ${projectName}`
          );

          // Get the list of winners from Entry Table given the projectId. filter the winners and only get discordUserId
          const entries = await getWinners(projectId);

          if (entries?.length === 0) {
            return console.log("No winners found");
          }

          console.log(
            `Got entries from project: ${projectName} : ${entries?.length}`
          );

          // Build the message using the list of winners and pass it in the channel
          const builtMessage = entries?.map((x) => `<@${x}>`).join(", ");

          // Send the message
          const channel = client.channels.cache.get(raffleChannelId);
          channel.send(`Winners for ${projectName}: ${builtMessage}`);

          console.log(`Sent winners for ${projectName} : ${entries.length}`);

          // Update the RaffleWinnerQueue from the projectId and mark the flag active as false. This means we don't need to query this queue anymore since we have proccessed this
          const { error } = await db
            .from("RaffleWinnerQueue")
            .update({
              active: false,
            })
            .match({ projectId });

          if (error) {
            console.log(error);
          }
        } catch (error) {
          console.log(error);

          // TODO: ping my telegram bot
        }
      })
      .subscribe();

    /**
     * Register the commands for TEST_GUILD_ID (development) and CLIENT_ID (production)
     */
    try {
      if (!TEST_GUILD_ID) {
        await rest.put(Routes.applicationCommands(CLIENT_ID), {
          body: commands,
        });
        console.log("Successfully registered application commands globally");
      } else {
        await rest.put(
          Routes.applicationGuildCommands(CLIENT_ID, TEST_GUILD_ID),
          {
            body: commands,
          }
        );
        console.log(
          "Successfully registered application commands for development guild"
        );
      }
    } catch (error) {
      if (error) console.error(error);
    }
  })();
});

client.on("interactionCreate", async (interaction) => {
  //if (!interaction.isCommand()) return
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
    if (error) console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});

client.on("roleCreate", async (role) => {
  console.log("roleCreate", role);
  console.log(role.iconURL);
});

client.on("roleUpdate", async (oldRole, newRole) => {
  console.log("roleUpdate", oldRole, newRole);
  console.log(JSON.stringify(oldRole));
  //console.log(newRole.guild.iconURL())
});

client.on("roleDelete", async (role) => {
  console.log("roleDelete", role);
});

// Login to Discord with your client's token
client.login(TOKEN);
