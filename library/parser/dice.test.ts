import { Dice } from "./dice";

it("parses 3d6 correctly", () => {
  const parseText = "3d6";
  const dice = new Dice(parseText);
  expect(dice).toHaveProperty("magnitude", 3);
  expect(dice).toHaveProperty("sides", 6);
});

it("rolls a 1 sided die correctly", () => {
  // this matches how dice are set for weighted tables
  let dice = new Dice();
  dice = Object.assign(dice, {
    magnitude: 1,
    sides: 1,
  });
  expect(dice.roll()).toEqual([1, [1]]);
});
