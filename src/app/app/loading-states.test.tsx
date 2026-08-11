import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AppLoading from "./loading";
import ShotsLoading from "./shots/loading";
import ShotLoading from "./shots/[shotId]/loading";
import ShotEditLoading from "./shots/[shotId]/edit/loading";
import NewShotLoading from "./shots/new/loading";
import BeansLoading from "./beans/loading";
import BeanLoading from "./beans/[beanId]/loading";
import NewBeanLoading from "./beans/new/loading";
import SetupLoading from "./setup/loading";

afterEach(cleanup);

describe("App loading states", () => {
  it.each([
    AppLoading,
    ShotsLoading,
    ShotLoading,
    ShotEditLoading,
    NewShotLoading,
    BeansLoading,
    BeanLoading,
    NewBeanLoading,
    SetupLoading,
  ])("rendert sofort ein designspezifisches Skeleton", (Loading) => {
    const { container } = render(<Loading/>);
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });
});
