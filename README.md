# B The Sport

Sportske vijesti s hrvatskih, regionalnih i svjetskih portala i društvenih mreža na jednom mjestu, razvrstane po sportu i prevedene na hrvatski. Aplikacija za Android, iPhone i web (Expo).

## Stanje: faza 1

| Dio | Stanje |
| --- | --- |
| Shema baze (izvori, članci, grupiranje, Hrvati u svijetu, sezonski tabovi) | gotovo, testirano na Postgresu 16 |
| Povlačenje RSS i YouTube feedova (Edge Function `ingest`) | napisano, testirana logika; čeka Supabase projekt |
| Određivanje sporta, grupiranje istih vijesti, prijevod | gotovo; prijevod čeka DeepL ključ |
| Ekrani: sportski tabovi, Portali (Sve/Hrvatska/Regija/Svijet, Hrvati u svijetu), Mreže, Postavke | gotovo |
| Provjera RSS adresa portala | čeka mrežni pristup portalima |

## Struktura

```
src/app/            ekrani (Portali = index, mreze, postavke)
src/components/     zaglavlje sa sportskim tabovima, kartica vijesti, feed
src/lib/            Supabase klijent, upiti, popis sportova
supabase/migrations shema baze
supabase/seed.sql   početni izvori (≈45 portala, 13 YouTube kanala) i hrvatski sportaši u inozemstvu
supabase/functions  ingest funkcija i zajednička logika (feed, sport, prijevod)
supabase/tests      testovi baze i logike
scripts/            provjera feedova
```

## Pokretanje

1. Otvori besplatni Supabase projekt i u SQL editoru pokreni `supabase/migrations/20261120000001_init.sql`, zatim `supabase/seed.sql`.
2. Kopiraj `.env.example` u `.env` i upiši URL i ključeve projekta.
3. Provjeri feedove i spremi ispravne adrese:

   ```bash
   npm run verify-sources -- --write
   ```

4. Objavi funkciju i postavi tajne (DeepL ključ je neobavezan; bez njega strane vijesti ostaju na originalnom jeziku):

   ```bash
   npx supabase functions deploy ingest
   ```

   ```bash
   npx supabase secrets set INGEST_SECRET=<nasumičan niz> DEEPL_API_KEY=<ključ>
   ```

5. U SQL editoru pokreni `supabase/cron.sql` (s upisanim `PROJECT_REF` i `INGEST_SECRET`): povlačenje svakih 5 minuta.
6. Pokreni aplikaciju i otvori je na Androidu kroz Expo Go:

   ```bash
   npx expo start
   ```

## Testovi

```bash
npm run typecheck
```

```bash
npm run test:backend
```

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/db_test.sql
```

## Sezonski tabovi

- **Zimski sportovi**: automatski od 1. studenog do 31. ožujka.
- **Vaterpolo**: vidljiv dok traje razdoblje upisano u tablicu `sport_windows` (npr. SP, EP, Olimpijske igre). Izvan toga vijesti idu pod Ostali sportovi.

```sql
insert into sport_windows (sport, label, starts_on, ends_on)
values ('vaterpolo', 'Naziv natjecanja', '<prvi dan>', '<zadnji dan>');  -- datumi su primjer
```
