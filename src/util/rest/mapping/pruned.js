import { getIndexVersions } from '../index/versions.js';

export default async (call, versions, idx) => {
  const localVersions = Object.keys(versions.get(idx));
  const remoteVersions = await getIndexVersions(call, idx);
  return remoteVersions.every((r) => localVersions.includes(r));
};
