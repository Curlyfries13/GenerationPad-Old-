import { Dice } from "./dice";

it("parses 3d6 correctly", () => {
  const parseText = "3d6";
  const dice = new Dice(parseText);
  expect(dice).toHaveProperty("magnitude", 3);
  expect(dice).toHaveProperty("sides", 6);
});
