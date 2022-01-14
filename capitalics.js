

// all money values monthly , netto
// all interest rates yearly in percent


function interestYearlyToMontly(interestRate) {
    return interestRate / 12.0;
}


/**
 * Format value as amount of money, i.e render it with 2 decimals. 
 */
function money(value) {
    return value.toFixed(2);
}


/**
 * Base class for all financial entities. A financial entity is expected to have a nextMoth method,
 * which shall simlulate the development of the financial entity over the period over one more month.
 * 
 * For example if the financial entity is initialized with a state describing "today", then calling
 * 12 times nextMonth() on it will result in it beeing in the state today + 1 year.
 * 
 * With the recordState method, the financial entity can record its current state to the recorder
 * instance, i.e. by publishing its internal values using the recorder.add method.
 */
export class FinancialEntity {
    nextMonth() {
        //
    }

    recordState(recorder) {
        //
    }

    getSummary() {
        return null;
    }
}


class TimeSeriesRecorder {
    constructor() {
        this.data = new Object();
        this.date = null;
    }

    setDate(date) {
        this.date = date;
    }

    add(name, value) {
        if (!(this.data[name] instanceof Array)) {
            this.data[name] = new Array();
        }

        this.data[name].push({x: this.date, y: value});
    }
}


export class Scheduler {
    // idea:
    // 1. run all actions
    // 2. run all accounts (eg. apply interest rates)
    // 3. run all transactions
    // 4. observe/report the resulting state

    constructor(actions, transactions, accounts) {
        this.actions = actions;
        this.transactions = transactions;
        this.accounts = accounts;
        this.dataRecorder = new TimeSeriesRecorder();
    }

    run(years) {
        var date = new Date();
        
        for (var month = 0; month < 12 * years; month++) {
            date.setMonth(date.getMonth() + 1);
            this.dataRecorder.setDate(new Date(date.getTime()));

            var all = this.actions.concat(this.accounts, this.transactions);

            for (var i = 0; i < all.length; i++) {
                all[i].nextMonth();
            }

            for (var i = 0; i < all.length; i++) {
                all[i].recordState(this.dataRecorder);
            }
        }

        return this.dataRecorder.data;
    }
}

/**
 * An account represents anything where money or debt is lying around.
 */
export class Account extends FinancialEntity {
    constructor(name) {
        super();
        this.name = name;
    }

    deduct(value) {
        //
    }

    deposit(value) {
        //
    }
}


export class Spending extends FinancialEntity {
    constructor(value) {
        super();
        this.value = value;
    }
}

export var OUT_THE_WINDOW = null;

export var OUT_OF_NOWHERE = null;

/**
 * A RegularTransaction deduces a certain amount from some account and
 * deposits it in another account every month.
 * The amount can either be a fixed value, can be determined by an array
 * of At-instances (see also SequenceAction class) with numeric values,
 * or it can be computed by invoking a callback function.
 * The from parameter can be OUT_OF_NOWHERE (do not deduce the amount from any account,
 * but deposit anyway in the account specified by to parameter).
 * The to parameter can be OUT_THE_WINDOW (deduce the amount from the from account,
 * but do not deposit it in any other account).
 */
export class RegularTransaction extends FinancialEntity {
    constructor(name, from, to, value) {
        super();
        this.name = name;
        this.from = from;
        this.to = to;
        
        if (value instanceof Array) {
            this.mode = "sequence";
            this.monthCounter = 0;
            this.ats = value;
            this.value = null;
            // Todo: verify this.ats actually contains At instances with values
        } else if (value instanceof Function) {
            this.mode = "callback";
            this.callback = value;
            this.value = null;
        } else if (value.toFixed) { // workaround for "is value a number?"
            this.mode = "numeric";
            this.value = value;
        } else {
            throw Error("invalid value, need number, array of At instaces or callack");
        }
    }
        
    nextMonth() {
        if (this.mode == "sequence") {
            // use value of latest At which is passed
            for (var i = this.ats.length - 1; i >= 0; i--) {
                var at = this.ats[i];
                if (at.passed(this.monthCounter)) {
                    this.value = at.param;
                    break;
                }
            }
        } else if (this.mode == "callback") {
            this.value = this.callback();
        }
        
        this.monthCounter++;

        if (this.from != OUT_OF_NOWHERE) {
            this.from.deduct(this.value);
        }

        if (this.to != OUT_THE_WINDOW) {
            this.to.deposit(this.value);
        }
    }

    recordState(recorder) {
        recorder.add(this.name, this.value);
    }
}


export class Savings extends Account {
    constructor(name, startValue, interestRate) {
        super(name);
        this.value = startValue;
        this.interests = new Interests(interestRate);
        this.accumulatedInterests = 0.0;
        this.payment = 0.0;
        this.minValue = startValue;
    }
    
    nextMonth() {
        var interests = this.interests.perMonth(this.value);
        this.accumulatedInterests += interests;
        this.value = this.value + this.payment + interests;

        if (this.value < this.minValue) {
            this.minValue = this.value;
        }
    }

    deposit(value) {
        this.value += value;
    }

    deduct(value) {
        this.value -= value;
    }

    recordState(recorder) {
        recorder.add(this.name, this.value);
    }
    
    getSummary() {
        return "Interests: " + money(this.accumulatedInterests) + "\n" +
               "Min Value: " + money(this.minValue);
    }
}


/**
 * Helper class to represent a interest rate.
 */
export class Interests {
    // yearly rate in percent
    constructor(ratePerYear) {
        this.ratePerYear = ratePerYear;
    }
    
    perMonth(value) {
        return value * (this.ratePerYear / 100.0 / 12);
    }
}


/**
 * Specifies a point in time.
 * 
 * Optionally add a value via the param parameter which can be retrieved later
 * from the object. With this you can eg. encode the development of a value
 * over time, eg. [new At(2050, 1, 123), new At(2050, 6, 321)].
 */
export class At {
    constructor(years, months, param) {
        this.years = years;
        this.months = months;
        this.param = param;
    }

    passed(months) {
        // return true if the point in time specified by the months
        // parameter is behind the one defined via years and months
        // members
        return months >= this.years * 12 + this.months;
    }
}

/**
 * Wrapper to run an other financial entity later, i.e. while the nextMonth method
 * of the wrapper is called from the beginning, it will only forward the call to the
 * other financial entity once the specified point in time has passed.
 */
export class Timer extends FinancialEntity {
    constructor(years, months, other) {
        super();
        this.start = new At(years, months);
        this.other = other;
        this.monthCounter = 0;
    }
    
    nextMonth() {
        if (this.start.passed(this.monthCounter)) {
            this.other.nextMonth();
        }
        
        this.monthCounter++;
    }

    recordState(recorder) {
        this.other.recordState(recorder);
    }

    getSummary() {
        return this.other.getSummary();
    }
}


/**
 * Can be hooked into the scheduler like a financial entity, but instead of generating a
 * value it runs an action (=callback function) at the specified point in time.
 * 
 * If the once parameter is set to true, the action will only be called once, otherwise
 * it will be run every month once the point in time has passed.
 */
export class TimerAction extends FinancialEntity {
    constructor(years, months, action, once) {
        super();
        this.start = new At(years, months);
        this.action = action;
        this.monthCounter = 0;
        this.once = once;
        this.happened = false;
    }
    
    nextMonth() {
        if (this.once && this.happened) {
            return;
        }

        if (this.start.passed(this.monthCounter)) {
            this.happened = true;
            this.action();
        }
        
        this.monthCounter++;
    }
}

/**
 * Wrapper to only forward the nextMonth call to other when
 * the condition (=callback function) returns true.
 */
export class When extends FinancialEntity {
    constructor(condition, other) {
        this.condition = condition;
        this.other = other;
    }

    nextMonth() {
        if (this.condition()) {
            this.other.nextMonth();
        }
    }

    getSummary() {
        return this.other.getSummary();
    }
}

/**
 * Can be hooked into the scheduler like any other FinancialEntity,
 * but instead of generating a value it will run an action once the condition
 * (=callback function) returns true.
 * With the once parameter it can be controlled whether the action will only
 * be run once and after that, independent of the condition will never be
 * executed again.
 */
export class WhenAction extends FinancialEntity {
    constructor(condition, action, once) {
        super();
        this.condition = condition;
        this.action = action;
        this.once = once;
        this.happened = false;
    }

    nextMonth() {
        if (this.once && this.happened) {
            return;
        }

        if (this.condition()) {
            this.happened = true;
            this.action();
        }
    }
}

/**
 * Allows to specify a sequence of points in time (At instances),
 * and a callback function "action" such that the action will be executed
 * each month with the latest At instance which has passed.
 * 
 * Note: At instances should be passed as arra in "ats" parameter and should
 * be sorted by increasing time.
 */
export class SequenceAction extends FinancialEntity {
    constructor(ats, action) {
        super();
        this.ats = ats;
        this.action = action;
        this.monthCounter = 0;
    }
    
    nextMonth() {
        // invoke action with the latest when which is passed
        for (var i = this.ats.length - 1; i >= 0; i--) {
            var at = this.ats[i];
            if (at.passed(this.monthCounter)) {
                this.action(at);
                break;
            }
        }
        
        this.monthCounter++;
    }
}


/**
 * Models a typical credit, i.e. an annuity loan which is granted by the bank as a ammount and then 
 * has to be payed back with monthly repayments. As long as the credit is not payed back completely,
 * the bank will get monthly interests according to a fixed interest rate.
 * 
 * The credit has three states:
 * * initial: money not retrieved from the bank yet
 * * credit: money retrieved, interests apply, paying back monthly
 * * done: everthing payed back
 * 
 * Note: for a credit calling deposit() with a positive amount means, that debt is reduced.
 * Since internally the credit class holds the current value as positive number, the deposit function
 * will therefore substract from it.
 * 
 * Note: a credit can have fixed costs (eg. entry in the land register) but those can be incorporated in the
 * effective yearly interest rate which is usually provided by the bank for a fixed period of time.
 */
export class Credit extends Account {
    constructor(name, credit, interestRate, payment) {
        super(name);
        this.credit = credit;
        this.interests = new Interests(interestRate);
        this.payment = payment;
        
        this.accumulatedInterests = 0.0;
        this.phase = "initial";
        this.value = 0.0;
        this.lastInterests = 0.0;
    }
    
    nextMonth() {
        // first time we get nextMonth call, switch to credit phase
        if (this.phase == "initial") {
            this.phase = "credit";
            this.value = this.credit;
        }

        if (this.phase == "credit") {
            this.lastInterests = this.interests.perMonth(this.value);
            this.accumulatedInterests += this.lastInterests;
            this.value += this.lastInterests;
            
            if (this.value <= 0.0) {
                this.phase = "done";
            }
        } else {
            this.value = 0.0;
            this.lastInterests = 0.0;
        }
    }

    deposit(value) {
        this.value -= value;
    }
    
    recordState(recorder) {
        recorder.add(this.name, this.value);
        recorder.add(this.name + '.interests', this.lastInterests);
    }

    getPayment() {
        if (this.phase == "initial") {
            return 0.0;
        } else if (this.phase == "credit") {
            return this.payment;
        } else if (this.phase == "done") {
            return 0.0;
        } else {
            return 0.0;
        }
    }

    getRateTransaction(from) {
        return new RegularTransaction(this.name + ".rate", from, this, this.getPayment.bind(this))
    }

    getDescription() {
        return "Credit: " + money(this.credit) + "\n" +
                "Interest rate: " + this.interests.ratePerYear + " %/a\n" +
                "Payment: " + money(this.payment);
    }
    
    getSummary() {
        return "Cost: " + money(this.getCost());
    }

    getCost() {
        return this.accumulatedInterests;
    }
}

/**
 * House savings are a two phase financial product which accounts of
 * * a saving phase in which montly savings are payed to the back. The ammount already saved will be granted interest rates by the bank.
 * * a credit phase where the saved ammount + an additional credit will be payed out by the bank and future repayments are made for the credit part.
 * 
 * House savings are designed to finance the acquisition of a house, or construction of a house. Typically the house savings is defined by the total sum
 * which consists of both the ammount which is targetted to be saved as well as the credit value to be granted by the bank.
 * 
 * Note: house savings are quite complex with many details which are hard to model:
 * * the time when the saving phase ends is quite flexible. Either savings are complete, or the credit is needed earlier.
 * * the bank does not guarantee a concrete time for the credit phase to start, typically it can be requested once 5% of the savings are there,
 *   but still the bank decides when it grants the credit.
 * * there are monthly costs for house savings
 * * there is an initial fee for a house savings contract (eg. 1 .. 2 %)
 * * there are incentives by the government
 */
export class HouseSavings extends Account {
    constructor(name, totalSum, payment, initialFeeRate, ownInterestRate, ownVsCredit, creditInterestRate) {
        super(name);
        this.payment = payment;
        this.ownVsCredit = ownVsCredit;
        this.totalSum = totalSum;
        this.ownInterests = new Interests(ownInterestRate);
        this.creditInterests = new Interests(creditInterestRate);
        
        this.feeToPay = initialFeeRate / 100.0 * totalSum;
        this.remainingFee = this.feeToPay;
        
        this.saved = 0.0;
        this.credit = 0.0;
        this.accumulatedSavingInterests = 0.0;
        this.accumulatedCreditInterests = 0.0;
        
        this.phase = "initial";
        this.value = 0.0;
    }
    
    nextMonth() {
        // first time we get nextMonth call, switch to saving phase
        if (this.phase == "initial") {
            this.phase = "saving";
        }

        if (this.phase == "saving") {
            var saving = this.payment;
            
            if (this.remainingFee > 0.0) {
                if (this.payment < this.remainingFee) {
                    this.remainingFee -= this.payment;
                    saving = 0.0;
                } else {
                    saving -= this.remainingFee;
                    this.remainingFee = 0.0;
                }
            }
            
            var interests = this.ownInterests.perMonth(this.saved);
            this.accumulatedSavingInterests += interests;
            this.saved += saving + interests;
            this.value = this.saved;
            
            if (this.value >= this.ownVsCredit / 100.0 * this.totalSum) {
                this.phase = "credit";
                this.credit = (1 - this.ownVsCredit / 100.0) * this.totalSum;
                console.log("house savings ready for credit phase");
            }
        } else if (this.phase == "credit") {
            var interests = this.creditInterests.perMonth(this.credit);
            this.accumulatedCreditInterests += interests;
            this.credit = this.credit - this.payment + this.creditInterests.perMonth(this.credit);
            
            this.value = this.credit;
            
            if (this.credit <= 0.0) {
                this.phase = "done";
            }
        } else {
            this.value = 0.0;
        }
    }

    stop(useTotal=false) {
        if (this.phase == "initial") {
            this.phase = "credit";
            this.value = this.remainingFee;
        } else if (this.phase == "saving") {
            this.phase = "credit"
            if (this.remainingFee > 0.0) {
                this.value = this.remainingFee;
                this.credit = 0;
                this.totalSum = 0;
            } else {
                if (useTotal) {
                    this.credit = this.totalSum - this.value;
                    this.value = this.credit;
                } else {
                    this.credit = this.value * (1 - this.ownVsCredit/100.0) / (this.ownVsCredit/100.0)
                    this.totalSum = this.value + this.credit
                    this.value = this.credit;
                }
            }
        } else if (this.phase == "done") {
            return;
        }
    }

    getDescription() {
        return "Total sum: " + money(this.totalSum) + "\n" +
                "Savings interest rate: " + this.ownInterests.ratePerYear + " %/a\n" +
                "Credit interest rate: " + this.creditInterests.ratePerYear + " %/a\n" +
                "Payment: " + money(this.payment);
    }
    
    getSummary() {
        return "Saving interests: " + money(this.accumulatedSavingInterests) + "\n" +
               "Credit interests: " + money(this.accumulatedCreditInterests) + "\n" +
               "Cost: " + money(this.getCost());
    }

    getCost() {
        return this.feeToPay + this.accumulatedCreditInterests - this.accumulatedSavingInterests;
    }
}


