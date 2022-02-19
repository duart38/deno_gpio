# Raspberry pi GPIO helpers made for Deno

An interface for interacting and reading from the raspberry pi GPIO pins using
_sysfs_.

## Why?

> Just for shits and giggles. Also why not? LOL!

# Examples

### Turning on an LED:

```TypeScript
/*
- set pin direction to out. will queue up an instruction to auto-export the pin
- also sets the pin value to high. RPis do not have analogue: 1 for HIGH 0 for LOW
*/
import { executeInstructions, Pin, PinDirection, sleep } from "./mod.ts";

// full bash-level execution.
const led = new Pin(24, PinDirection.OUT, 1);
sleep(5);
led.setValue(0);
led.unexport();
executeInstructions(); // executes the above instructions.
```
it is **highly recommended** you unexport the pin after you are done using it.

It is also possible to take a more hybrid approach in which you come back to
javascript:
```TypeScript
// alternative hybrid (transfer from bash to JS and vice-versa)
// note that this approach is a bit slower and can cause timing issues with some 'dumb' sensors that require precise instruction sequences.
const led = new Pin(24, PinDirection.OUT, 1);
// the Pin constructor queues up some export instructions.. we are executing these here
executeInstructions(); // calls sysfs. returns a promise.

// standard JS timeout..
setTimeout(() => {
  led.setValue(0);
  led.unexport();
  executeInstructions();
}, 4000);
```

### Listening for button press

```TypeScript
import { executeInstructions, Pin, PinDirection } from "./mod.ts";

const button = new Pin(24, PinDirection.IN);
// the Pin constructor queues up some export instructions.. execute here.
await executeInstructions();
console.log("Waiting for button press");

while (true) {
  if (button.readValue() == 1) {
    console.log("button pressed");
    button.unexport();
    executeInstructions();
    break;
  }
}
```

# Limitations

1. JavaScript it not very 'precise'. i.e. no microsecond delay support for
   interacting with hardware that requires this (e.g. DHT11). To circumvent this, a method named *pipeValue* can be used to add read instructions in the instruction queue which will be executed along other instructions (including sleep instructions) in a shell.

# Deno on the pi?

> YES!!!!
> [This will explain it all](https://github.com/LukeChannings/deno-arm64)
