import Airtable from 'airtable';
import { User } from 'discord.js';
import dotenv from 'dotenv'
import { LookupItem } from '../types';
import isDiscordId from './discordIdChecker'

dotenv.config()
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const BASE = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN! }).base(process.env.AIRTABLE_BASE!)

export async function isContributor(user: User) {
    const table = BASE('Contributor')
    const contributors = await table.select({
        // eslint-disable-next-line quotes
        filterByFormula: "NOT({DiscordId} = '')",
    }).all();
    for (const record of contributors) {
        if (user.discriminator === record.fields.DiscordId) {
            return true
        }
    }
    return false
}

export async function createContributor(user: User, nftID: string, twitterHandle?: string, ethWalletAddress?: string) {
    const table = BASE('Contributor')
    table.create([
        {
            'fields': {
                'Discord Handle': `${user.username}:${user.discriminator}`,
                'DiscordId': `${user.id}`,
                'DevDAO ID': nftID,
                'Twitter Handle': twitterHandle,
                'ETH Wallet Address': ethWalletAddress,
            },
        },
    ], (err, records) => {
        if (err) {
            console.error(err);
            return;
        }
        records?.forEach((record) => console.log(record.getId()));
    })
}

export function createTag(tag: string) {
  const table = BASE('Tags');
  table.create([
    {
      'fields': {
        Name: tag,
      },
    },
  ], (err, records) => {
    if (err) {
      console.error(err)
      return;
    }
    records?.forEach((record) => console.log(record.getId()));
  })
}

export function createCategory(category: string) {
  const table = BASE('Category');
  table.create([
    {
      'fields': {
        Name: category,
      },
    },
  ], (err, records) => {
    if (err) {
      console.error(err)
      return;
    }
    records?.forEach((record) => console.log(record.getId()));
  })
}

export function createBlockchain(blockchain: string, website: string | null) {
  const table = BASE('Blockchain');
  table.create([
    {
      'fields': {
        Name: blockchain,
        Website: website ?? '',
      },
    },
  ], (err, records) => {
    if (err) {
      console.error(err)
      return;
    }
    records?.forEach((record) => console.log(record.getId()));
  })
}

export function readTags(): Promise<LookupItem[]> {
  return readLookup('Tags');
}

export function readCategory(): Promise<LookupItem[]> {
  return readLookup('Category');
}

export function readBlockchain(): Promise<LookupItem[]> {
  return readLookup('Blockchain');
}

export function readLookup(tableName: string): Promise<LookupItem[]> {
    return new Promise((resolve, reject) => {
    const table = BASE(tableName);
    const items: LookupItem[] = [];
    table.select({
        maxRecords: 10,
        view: 'Grid view',
      }).eachPage(function page(records, fetchNextPage) {
          records.forEach(function(record) {
              const name = record.get('Name');
              const id = record.id;
              items.push({
                id,
                name: `${name}`,
              });
          });

          fetchNextPage();
      }, function done(err) {
          if (err) {
            console.error(err);
            reject(err);
          }
          items.sort((a, b) => a.name.localeCompare(b.name));
          resolve(items);
      });
  })
}
