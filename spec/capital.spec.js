
import {At, Credit, Interests, OUT_OF_NOWHERE, OUT_THE_WINDOW, RegularTransaction, Savings, Scheduler, Spending, Timer, TimerAction} from "../capitalics.js";

describe("RegularTransaction", function() {
    it("works", function() {
        var t1 = new RegularTransaction("t1", OUT_OF_NOWHERE, OUT_THE_WINDOW, 100);
        t1.nextMonth();
        expect(t1.name).toBe("t1");
        expect(t1.value).toBe(100);


        var callback = function() {
            return 200;
        };

        var t2 = new RegularTransaction("t2", OUT_OF_NOWHERE, OUT_THE_WINDOW, callback);
        t2.nextMonth();
        expect(t2.value).toBe(200);

        var t3 = new RegularTransaction("t3", OUT_OF_NOWHERE, OUT_THE_WINDOW, [new At(0, 0, 101), new At(0, 1, 202)]);
        t3.nextMonth();
        expect(t3.value).toBe(101);
        t3.nextMonth();
        expect(t3.value).toBe(202);
    });
});

describe("Credits", function() {
    it("basic interest calculation", function() {
        var credit_value = 2000;
        var credit_interests = 1.0;
        var credit_payment = 1000;
        var credit = new Credit("credit", credit_value, credit_interests, credit_payment);
        expect(credit.phase).toBe("initial");

        credit.nextMonth();
        var firstInterests = credit_value * (credit_interests / 100.0 / 12.0)
        var firstMonthExpected = credit_value * (1.0 + credit_interests / 100.0 / 12.0);
        expect(credit.value).toBeCloseTo(firstMonthExpected);
        credit.deposit(credit_payment);

        credit.nextMonth();
        var secondInterests = (firstMonthExpected - credit_payment) * (credit_interests / 100.0 / 12.0)
        var secondMonthExpected = (firstMonthExpected - credit_payment) * (1.0 + credit_interests / 100.0 / 12.0);
        expect(credit.value).toBeCloseTo(secondMonthExpected);
        credit.deposit(credit_payment);

        credit.nextMonth();
        var thirdInterests = (secondMonthExpected - credit_payment) * (credit_interests / 100.0 / 12.0)
        var thirdMonthExpected = (secondMonthExpected - credit_payment) * (1.0 + credit_interests / 100.0 / 12.0);
        expect(credit.value).toBeCloseTo(thirdMonthExpected);
        credit.deposit(credit_payment);

        credit.nextMonth();
        expect(credit.phase).toBe("done");
        expect(credit.value).toBe(0.0);
        expect(credit.getCost()).toBeCloseTo(firstInterests + secondInterests + thirdInterests);

        // calling again should not hurt
        credit.nextMonth();
        expect(credit.value).toBe(0.0);
        expect(credit.getCost()).toBeCloseTo(firstInterests + secondInterests + thirdInterests);
    });
  });
  
  