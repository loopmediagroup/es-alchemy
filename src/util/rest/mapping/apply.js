import assert from 'assert';
import { getIndexVersions, createIndexVersion } from '../index/versions.js';

export default async ({ call, versions, idx }) => {
  const localVersions = versions.get(idx);
  const remoteVersions = await getIndexVersions(call, idx);
  const versionsToCreate = Object.entries(localVersions).filter(([key]) => !remoteVersions.includes(key));
  const versionsCreatedResult = await Promise.all(
    versionsToCreate.map(([_, { mapping }]) => createIndexVersion(call, idx, mapping))
  );
  const versionsCreated = versionsToCreate.map(([v]) => `${idx}@${v}`);
  assert(versionsCreatedResult.every((e) => e === true), versionsCreated);
  return versionsCreated;
};
