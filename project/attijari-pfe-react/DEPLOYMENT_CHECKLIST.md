# 🚀 CHECKLIST DE DÉPLOIEMENT

## ✅ Avant de commencer

- [ ] Vous avez le `.env` avec les vraies URLs Power BI
- [ ] Vous pouvez accéder à https://app.powerbi.com avec vos identifiants
- [ ] Vous avez clonné/ouvert le projet dans VS Code
- [ ] `npm install` a été exécuté

---

## 📋 Installation & Configuration

### 1. Installer les dépendances
```bash
cd project/attijari-pfe-react
npm install
```
- [ ] Pas d'erreurs
- [ ] `node_modules/` créé
- [ ] `package-lock.json` généré

### 2. Vérifier le `.env`
```bash
cat .env
```
Doit contenir :
```env
VITE_API_BASE_URL=http://localhost:5000/api
# Toutes les variables NEXT_PUBLIC_POWERBI_* configurées
```
- [ ] `.env` existe
- [ ] Tous les `NEXT_PUBLIC_POWERBI_*` sont présents
- [ ] Les URLs sont correctes

### 3. Vérifier les fichiers créés
```bash
ls -la src/config/dashboards.ts
ls -la src/components/powerbi/ReportFrame.tsx
ls -la src/pages/dashboards/DashboardsHub.tsx
```
- [ ] `src/config/dashboards.ts` existe
- [ ] `src/components/powerbi/ReportFrame.tsx` existe
- [ ] `src/pages/dashboards/DashboardsHub.tsx` existe

---

## 🧪 Tests locaux

### 1. Démarrer le serveur dev
```bash
npm run dev
```
- [ ] Pas d'erreurs de compilation
- [ ] `Local: http://localhost:5173` affiché
- [ ] Pas de warnings TypeScript critiques

### 2. Accéder à l'application
Ouvrez `http://localhost:5173` dans le navigateur
- [ ] La page de login s'affiche
- [ ] Pas d'erreurs dans la console (F12)

### 3. Se connecter
Utilisez vos identifiants
- [ ] Login réussit
- [ ] Redirection vers `/home`
- [ ] Le sidebar s'affiche

### 4. Tester les dashboards

**Test 1 : Vue Globale**
```
1. Cliquez sur "Vue globale" dans le sidebar
2. Route devient /dashboards/vue-globale
3. Un iframe Power BI s'affiche
4. Onglet "Vue Globale" est souligné
```
- [ ] L'iframe charge (pas de blanc)
- [ ] L'onglet devient actif
- [ ] Les boutons (Actualiser, Ouvrir Power BI, Plein écran) fonctionnent

**Test 2 : Clients & Churn**
```
1. Cliquez sur "Clients churn"
2. Route devient /dashboards/clients-churn
3. Un iframe DIFFÉRENT s'affiche
4. Onglet "Clients & Churn" est souligné
```
- [ ] L'iframe change (pas le même contenu qu'avant)
- [ ] L'onglet change
- [ ] Les boutons fonctionnent

**Test 3 : Campagnes (sub-navigation)**
```
1. Cliquez sur "Campagnes"
2. Route devient /dashboards/campagnes
3. Vous voyez des boutons "Vue Globale", "Google Ads", "Meta Ads"
4. L'iframe affiche la "Vue Globale Campagnes"
```
- [ ] Les 3 boutons s'affichent
- [ ] L'iframe affiche la page Campagnes

```
5. Cliquez sur "Google Ads"
6. L'iframe change pour afficher "Google"
7. Le bouton "Google Ads" devient actif
```
- [ ] L'iframe change
- [ ] Le bouton change de couleur
- [ ] Pas de rechargement de page

```
8. Cliquez sur "Meta Ads"
9. L'iframe change pour afficher "Meta"
10. Le bouton "Meta Ads" devient actif
```
- [ ] L'iframe change
- [ ] Le bouton change de couleur
- [ ] Pas de rechargement de page

**Test 4 : Navigation par onglets**
```
1. Vous êtes sur Vue Globale
2. Cliquez sur "Clients & Churn" (onglet en haut)
3. Route devient /dashboards/clients-churn
4. L'iframe change
```
- [ ] La route change
- [ ] L'iframe change
- [ ] Pas de rechargement de page

**Test 5 : Boutons d'action**
```
1. Cliquez sur "Actualiser"
2. L'iframe recharge
```
- [ ] L'iframe recharge
- [ ] Pas d'erreurs

```
3. Cliquez sur "Ouvrir Power BI"
4. Power BI s'ouvre dans un nouvel onglet
```
- [ ] Nouvel onglet s'ouvre
- [ ] Page Power BI se charge

```
5. Cliquez sur "Plein écran"
6. L'iframe passe en plein écran
```
- [ ] L'iframe prend tout l'écran
- [ ] Appuyez sur Esc pour quitter

**Test 6 : Responsive (mobile)**
```
1. Ouvrez les DevTools (F12)
2. Allez à l'onglet "Device toolbar"
3. Sélectionnez "iPhone 12"
4. Naviguez entre les dashboards
```
- [ ] Les onglets se wrappent
- [ ] L'iframe est responsive
- [ ] Les boutons restent cliquables
- [ ] Pas de horizontal scroll

### 5. Vérifier la console
Ouvrez F12 → Console
- [ ] Pas d'erreurs (console clean)
- [ ] Pas de warnings concernant les composants
- [ ] Messages de log s'affichent (`Dashboard {key} loaded`)

---

## 🔍 Vérifications de code

### 1. TypeScript
```bash
npx tsc --noEmit
```
- [ ] Pas d'erreurs TypeScript
- [ ] Tous les types sont corrects

### 2. Imports
Vérifiez que les fichiers suivants existent :
```
src/config/dashboards.ts ✓
src/components/powerbi/ReportFrame.tsx ✓
src/pages/dashboards/DashboardsHub.tsx ✓
src/types/powerbi.ts ✓
```

### 3. Exports
Vérifiez que les exports existent :
```tsx
// config/dashboards.ts doit exporter :
export { POWER_BI_CONFIG, DASHBOARD_PAGES, CAMPAIGNS_SUBREPORTS }
export { buildPowerBiEmbedUrl, getDashboardByRoute }

// components/powerbi/ReportFrame.tsx doit exporter :
export { ReportFrame }

// pages/dashboards/DashboardsHub.tsx doit exporter :
export default DashboardsHub
```

### 4. Routes
Vérifiez que App.tsx a les bonnes routes :
```tsx
<Route path="/dashboards/vue-globale" element={<DashboardsHub />} />
<Route path="/dashboards/clients-churn" element={<DashboardsHub />} />
<Route path="/dashboards/campagnes" element={<Campagnes />} />
<Route path="/dashboards/reclamations" element={<DashboardsHub />} />
<Route path="/dashboards/agences" element={<DashboardsHub />} />
<Route path="/dashboards/social-media" element={<DashboardsHub />} />
```

---

## 🧹 Nettoyage (Optionnel)

Si vous voulez faire place nette, vous pouvez supprimer les anciens fichiers :

```bash
rm src/pages/dashboards/VueGlobale.tsx
rm src/pages/dashboards/ClientsChurn.tsx
rm src/pages/dashboards/Reclamations.tsx
rm src/pages/dashboards/Agences.tsx
rm src/pages/dashboards/SocialMedia.tsx
```

**Attention** : Assurez-vous qu'ils ne sont pas importés ailleurs avant de les supprimer !

---

## 📊 Vérification finale

- [ ] Tous les dashboards s'affichent
- [ ] La sous-navigation Campagnes fonctionne
- [ ] Les onglets reflètent la route
- [ ] Les boutons d'action fonctionnent
- [ ] Aucune erreur en console
- [ ] Responsive sur mobile
- [ ] Build sans erreur : `npm run build`
- [ ] Pas de warnings TypeScript

---

## 🎉 Prêt pour la production !

Si toutes les cases sont cochées, vous pouvez :

1. Commiter les changements
```bash
git add .
git commit -m "feat: Power BI integration with dynamic navigation"
git push origin main
```

2. Déployer
```bash
npm run build
# Déployer le dossier dist/
```

3. Célébrer ! 🎉

---

## 🆘 Dépannage

### L'iframe est blanc
- [ ] Vérifiez que le `.env` a les bonnes URLs
- [ ] Vérifiez que Power BI est accessible
- [ ] Vérifiez que le Report ID est correct
- [ ] Vérifiez les paramètres d'Embed

### Les onglets ne changent pas
- [ ] Vérifiez que la route change (DevTools → Network)
- [ ] Vérifiez que `getDashboardByRoute()` retourne le bon dashboard
- [ ] Vérifiez que `buildPowerBiEmbedUrl()` construit la bonne URL

### Erreurs TypeScript
- [ ] Vérifiez que les imports sont corrects
- [ ] Vérifiez que les types sont bien définis
- [ ] Vérifiez que les fichiers existent

### Erreurs de console
- [ ] Ouvrez la console (F12)
- [ ] Cherchez les messages d'erreur
- [ ] Utilisez `console.log()` pour debuguer
- [ ] Vérifiez que les composants se chargent

---

## 📞 Documentation

Consultez les fichiers suivants pour plus d'infos :
- `POWERBI_ARCHITECTURE.md` - Architecture complète
- `IMPLEMENTATION_SUMMARY.md` - Résumé d'implémentation
- `PROJECT_STRUCTURE.md` - Structure du projet
- `src/config/EXAMPLES.tsx` - Exemples de code

---

**Bon déploiement !** 🚀
