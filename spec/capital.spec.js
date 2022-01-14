
import {At, Credit, Interests, OUT_OF_NOWHERE, RegularTransaction, Savings, Scheduler, Spending, Timer, TimerAction} from "../capitalics.js";

describe("Credits", function() {
    it("basic interest calculation", function() {
        var credit_value = 100000;
        var credit_interests = 1.0;
        var credit_payment = 500;
        var credit = new Credit("credit", credit_value, credit_interests, credit_payment);
        expect(credit.phase).toBe("initial");

        credit.nextMonth();
        credit.deposit(credit_payment);
        var firstInterests = credit_value * (credit_interests / 100.0 / 12.0)
        var firstMonthExpected = credit_value * (1.0 + credit_interests / 100.0 / 12.0) - credit_payment;
        expect(credit.value).toBe(firstMonthExpected);
        
        credit.nextMonth();
        credit.deposit(credit_payment);
        var secondInterests = firstMonthExpected * (credit_interests / 100.0 / 12.0)
        var secondMonthExpected = firstMonthExpected * (1.0 + credit_interests / 100.0 / 12.0) - credit_payment;
        expect(credit.value).toBeCloseTo(secondMonthExpected);

        expect(credit.getCost()).toBeCloseTo(firstInterests + secondInterests);
    });
  });
  
  