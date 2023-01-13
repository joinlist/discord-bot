const fs = require("fs");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
// Require the necessary discord.js classes
const {
  Client,
  GatewayIntentBits,
  Collection,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { db } = require("./utils/db.js");

const getProject = async ({ projectId, select = "id, name, slug" }) => {
  return (
    await db.from("Project").select(select).match({ id: projectId }).single()
  )?.data;
};

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

  /**
   * Process the announcement
   */
  (async () => {
    db.from("Announcement")
      .on("INSERT", async (payload) => {
        // Payload looks like:
        // {
        //   schema: 'public',
        //   table: 'Announcement',
        //   commit_timestamp: '2023-01-12T15:49:32Z',
        //   eventType: 'INSERT',
        //   new: { channelId: '1002460057222520955', id: 2, projectId: '1474' },
        //   old: {},
        //   errors: null
        // }

        try {
          /**
           * Errors is either null or an array of errors
           */
          const errors = payload.errors;

          if (errors) {
            throw new Error(errors);
          }

          const projectId = payload.new.projectId;
          const type = payload.new.type;
          const channelId = payload.new.channelId;
          const provider = payload.new.provider;
          const channel = client.channels.cache.get(channelId);

          if (!channel) {
            console.error("Channel not found");
            return;
          }

          if (!projectId) {
            console.error("Project id not found");
            return;
          }

          if (!type) {
            console.error("Type not found");
            return;
          }

          if (!provider) {
            console.error("Provider not found");
            return;
          }

          // ,--.   ,--.,--.,--.  ,--.,--.  ,--.,------.,------.
          // |  |   |  ||  ||  ,'.|  ||  ,'.|  ||  .---'|  .--. '
          // |  |.'.|  ||  ||  |' '  ||  |' '  ||  `--, |  '--'.'
          // |   ,'.   ||  ||  | `   ||  | `   ||  `---.|  |\  \
          // '--'   '--'`--'`--'  `--'`--'  `--'`------'`--' '--'
          if (type === "winner") {
            console.log("Processing winner announcement");

            /**
             * Get project name
             */
            const projectName = (await getProject({ projectId }))?.name;

            if (!channelId) {
              return console.log(
                `No channel id found for projectId ${projectId}!`
              );
            }

            console.log(
              `Got channelId: ${channelId} from project: ${projectName}`
            );

            /**
             * Returns list of discord user ids that are winners
             */
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
            channel.send(`Winners for ${projectName}: ${builtMessage}`);

            console.log(`Sent winners for ${projectName} : ${entries.length}`);
          } else if (type === "raffle") {
            // ,------.   ,---.  ,------.,------.,--.   ,------.
            // |  .--. ' /  O  \ |  .---'|  .---'|  |   |  .---'
            // |  '--'.'|  .-.  ||  `--, |  `--, |  |   |  `--,
            // |  |\  \ |  | |  ||  |`   |  |`   |  '--.|  `---.
            // `--' '--'`--' `--'`--'    `--'    `-----'`------'
            const project = await getProject({
              projectId,
              select: "*",
            });

            if (!project) {
              console.error("Project not found");
              return;
            }

            /**
             * Get the author of the project
             */
            const userId = project?.userId;
            const twitterProfile = (
              await db
                .from("Account")
                .select("*")
                .match({ userId, provider: "twitter" })
                .single()
            )?.data?.profile;

            const { profile_image_url_https, name } = twitterProfile || {};

            /**
             * Create the embed
             */
            const exampleEmbed = new EmbedBuilder()
              .setColor(0x0099ff)
              .setTitle(project.name)
              .setURL(`https://www.joinlist.me/${project.slug}`)
              .setAuthor({
                name,
                iconURL: profile_image_url_https,
              })
              .setDescription(project?.description)
              .setThumbnail(project.image)
              .addFields({ name: "\u200B", value: "\u200B" })
              .addFields({
                name: "Ends at",
                value: new Date(project.endAt).toLocaleString(),
              })
              .setImage(project?.bannerImage || project.image)
              .addFields({ name: "\u200B", value: "\u200B" })
              .setTimestamp();
            /**
             * Create the button
             */
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                //.setCustomId("primary")
                .setLabel("Go to project")
                .setStyle(ButtonStyle.Link)
                .setURL(`https://www.joinlist.me/${project.slug}`)
            );

            /**
             * Send the embed and button
             */
            channel.send({ embeds: [exampleEmbed], components: [row] });
            console.log(`Sent raffle announcement for ${project.name}`);
          } else {
            console.error("Unknown type");
          }
        } catch (error) {
          console.log(error);

          // TODO: ping my telegram bot
        }
      })
      .subscribe();
  })();

  /**
   * Registering the commands
   */
  (async () => {
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
