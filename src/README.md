# Dépendances
Pour faire fonctionner le bot en local, il vous faut nodejs, npm, [l'émulateur BotBuilder de Microsoft](https:// www.github.com/Microsoft/BotFramework-Emulator) et MongoDB.

# Prérequis
Pour faire foncitonner ce chatbot, vous devez vous munir du lien permettant de questionner votre propre application Luis.ai. Ce lien est à remplir dans `config.js`. Les *utterances* fournies à l'application qui a été utilisée au cours du développement sont disponibles dans le dossier `assets` sous forme de JSON. Je ne saurais trop vous encourager à enrichir ces exemples si vous souhaitez faire autre chose que juste tester le fonctionnement du chatbot.

Il vous faudra également remplir dans `config.js` l'adresse de votre base de données MongoDB (probablement de la forme `mongodb://localhost:12345/MyDatabase`).

# Utilisation
Installer les packages utilisés avec npm :

    npm install

Lancer le programme :

    node main.js

Depuis le dossier BotFramework-Emulator, lancer l'émulateur (différent selon votre méthode d'installation de l'émulateur).

Avec npm :

    npm run start
