
import {formatMoney, monthlyRateCallback, At, Credit, Interests, OUT_OF_NOWHERE, OUT_THE_WINDOW, RegularTransaction, Savings, Scheduler, Spending, Timer, TimerAction} from "../capitalics.js";

describe("small stuff", function() {
    it("formatMoney", function() {
        var value = formatMoney(123.45678);
        expect(value).toBe("123.46");
    });

    it("monthlyRateCallback", function() {
        var callback = monthlyRateCallback(1000, 1.0);
        var valueAfterOneMonth = callback(1);
        expect(valueAfterOneMonth).toBe(1000 + 1000 * 0.01);

        var valueAfterTwoMonths = callback(2);
        expect(valueAfterTwoMonths).toBe(valueAfterOneMonth + valueAfterOneMonth * 0.01)
    });
});

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
  
  
  
describe("Scheduler", function() {
    it("works", function() {
        
        var interestRate = 1.0;
        var startValue = 1000;
        var savings = new Savings("savings", startValue, interestRate);
        
        var specialDeposit = 10000;
        var action = new TimerAction(0, 1,
            function() {
                savings.deposit(specialDeposit);
            }, true);
        
        var income = 100;
        var transaction = new Timer(0, 1, new RegularTransaction("transaction", OUT_OF_NOWHERE, savings, income));

        var scheduler = new Scheduler([action], [savings], [transaction]);
        var data = scheduler.run(1);

        // 1 year = 12 months
        expect(data["savings"].length).toBe(12);

        // for each month (12 in this case), scheduler shall run 1. actions, 2. accounts, 3. transactions
        // 1. month: no action, collect interests, no transaction
        var interestsFactor =  (1.0 + interestRate / 100.0 / 12);
        var savingsAfter1Month = startValue * interestsFactor;
        expect(data["savings"][0]["y"]).toBeCloseTo(savingsAfter1Month);

        // 2. month: specialDeposit, collect interests, add income
        var savingsAfter2Months = (savingsAfter1Month + specialDeposit) * interestsFactor + income;
        expect(data["savings"][1]["y"]).toBeCloseTo(savingsAfter2Months);

    });
});