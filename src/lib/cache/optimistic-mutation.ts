import type { MutatorCallback, MutatorOptions } from "swr";

type OptimisticMutator<Data> = (
  data?: Data | MutatorCallback<Data>,
  options?: boolean | MutatorOptions<Data>,
) => Promise<Data | undefined>;

export async function runOptimisticMutation<Data, Result>({
  mutate,
  optimisticData,
  mutation,
  commit,
}: {
  mutate: OptimisticMutator<Data>;
  optimisticData: (current: Data | undefined) => Data | undefined;
  mutation: () => Promise<Result>;
  commit?: (current: Data | undefined, result: Result) => Data | undefined;
}) {
  let previous: Data | undefined;
  await mutate((current) => {
    previous = current;
    return optimisticData(current);
  }, { revalidate: false });

  try {
    const result = await mutation();
    if (commit) await mutate((current) => commit(current, result), { revalidate: false });
    return result;
  } catch (error) {
    await mutate(previous, { revalidate: false });
    throw error;
  }
}
