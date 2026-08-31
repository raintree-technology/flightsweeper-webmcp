# FlightSweeper demo transcript

Read this naturally while the silent demo video plays. The timestamps mark each visual change; they are guides, not deadlines. Pause briefly between sections.

## 0:00–0:14

A traveler sets the rules. ChatGPT searches and acts. FlightSweeper decides whether the purchase is allowed. This challenge build is a sandbox, so it never charges a card or creates an airline order.

## 0:14–0:32

Our mission is Los Angeles to New York, departing September ninth. The flight must arrive by seven P.M. local time. Economy and premium economy are allowed, with no more than one stop. The fare must be fully refundable, and the limit is nine hundred dollars.

## 0:32–0:49

Web Model Context Protocol, or WebMCP, gives ChatGPT structured tools inside this page. The available tools change as the transaction moves forward. ChatGPT reads the mission, searches the sandbox inventory, and shares the same workspace with the traveler.

## 0:49–1:10

Here is the first test. The cheapest offer includes a supplier message telling the agent to ignore the mission. FlightSweeper does not trust supplier text. Its policy engine checks the stored rules and denies the offer because it is not refundable. The denial receipt shows the failed rule and the value that caused it.

## 1:10–1:24

Now the traveler tightens the mission to nonstop. The agent can make its authority narrower, but it cannot make that authority broader. FlightSweeper starts a new policy version and clears the old selection, quote, and approval.

## 1:24–1:45

ChatGPT selects the eligible Coast Air offer at six hundred eighty-four dollars and thirty-two cents. It refreshes the quote, then requests a policy decision. FlightSweeper checks the route, date, arrival time, cabin, stops, refundability, price, quote age, and purchase authority.

## 1:45–2:00

Every rule passes. ChatGPT submits the purchase with an idempotency key, and FlightSweeper issues one sandbox ticket. The receipt records the policy, quote, checks, actor, time, and result.

## 2:00–2:15

Watch what happens when ChatGPT repeats the purchase. FlightSweeper returns the original ticket. There is no second transaction. The traveler can revoke future purchase authority, while the ticket and decision receipts remain available after a reload.

## 2:15–2:23

The traveler controls the mandate. ChatGPT handles the work. FlightSweeper enforces the decision and keeps the proof.
