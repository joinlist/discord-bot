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
   * Announce winners of the raffle
   */

  (async () => {
    db.from("Project")
      .on("UPDATE", async (payload) => {
        // Payload looks like:
        // {
        //   schema: 'public',
        //   table: 'Project',
        //   commit_timestamp: '2023-01-12T14:10:37Z',
        //   eventType: 'UPDATE',
        //   new: {
        //     id: 1474,
        //     html: null,
        //     ogImage: null,
        //     mintPrice: null,
        //     status: 'sfd',
        //     type: null,
        //     questionRequired: null,
        //     raffleQuantity: null,
        //     startAt: null,
        //     showEntries: true,
        //     image: null,
        //     supply: null,
        //     addressRequired: null,
        //     phoneRequired: null,
        //     updatedAt: '2023-01-12T12:37:54.53+00:00',
        //     questionText: null,
        //     verified: false,
        //     website: null,
        //     contractsMustOwn: 'any',
        //     userId: 9543,
        //     hasBrandingEnabled: true,
        //     waitlistSearch: false,
        //     mintSupply: null,
        //     createdAt: '2023-01-12T11:54:04.983+00:00',
        //     maxEntries: null,
        //     questionType: null,
        //     twoFactorAuth: null,
        //     public: true,
        //     endAt: null,
        //     reward: false,
        //     description: null,
        //     themeCustom: null,
        //     mintDate: null,
        //     slug: 'tkja0',
        //     emailRequired: null,
        //     name: 'Doodles X Copy',
        //     nameRequired: null,
        //     chain: null
        //   },
        //   old: { id: 1474 },
        //   errors: null
        // }

        console.log("Got payload: ", payload);

        try {
          const projectId = payload.new.id;
          const status = payload.new.status;
          const projectName = payload.new.name;

          if (status !== "drawn") {
            return console.log("Project is not drawn yet");
          }

          // Get the channelId from the database from the projectId
          const { raffleChannelId } =
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

  /**
   * Announce the raffle
   */
  (async () => {
    try {
      const channel = client.channels.cache.get("1002460057222520955");
      const project = await getProject({
        projectId: 1474,
        select: "*",
      });
      const exampleEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(project.name)
        .setURL("https://discord.js.org/")
        // .setAuthor({
        //   name: "Some name",
        //   iconURL: "https://i.imgur.com/AfFp7pu.png",
        //   url: "https://discord.js.org",
        // })
        .setDescription(project?.description)
        .setThumbnail(project.image)
        .addFields({ name: "\u200B", value: "\u200B" })
        .addFields({
          name: "Ends at",
          // project.endAt format is ISO 2023-01-12 12:37:54.53+00, format to Thu Jan 15:15 format
          value: new Date(project.endAt).toLocaleString(),
        })
        //.addFields({ name: "\u200B", value: "\u200B" })
        // .addFields({
        //   name: "Inline field title",
        //   value: "Some value here",
        // })
        // //.addFields({ name: "\u200B", value: "\u200B" })
        // .addFields({
        //   name: "Inline field title",
        //   value: "Some value here!",
        // })
        .addFields({ name: "\u200B", value: "\u200B" })
        // .setImage(
        //   "https://pbs.twimg.com/profile_banners/1487866247803027457/1643571790"
        // )
        .setTimestamp();
      // .setFooter({
      //   text: "Some footer text here",
      //   iconURL: "https://i.imgur.com/AfFp7pu.png",
      // });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          //.setCustomId("primary")
          .setLabel("Go to project")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://www.joinlist.me/${project.slug}`)
      );

      channel.send({ embeds: [exampleEmbed], components: [row] });
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
