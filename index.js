import {
  month_name_list,
  average_working_hours_per_month
} from "./constant.js";

export default new Vue({
  el: "#app",
  data: {
    condition: {
      monthName: "",
      minimumWage: "",
      workHours: "",
      breakTime: "",
      workingDays: "",
      holiday: ""
    },
    result: {
      minimumWage: null,
      overtimePay: null,
      totalSalary: null,
      hourlyWage: null
    }
  },
  computed: {
    hourlyWage() {
      return new Decimal(this.condition.minimumWage)
        .div(8)
        .div(30);
    },
    month() {
      return month_name_list.indexOf(this.condition.monthName) + 1;
    },
    totalWorkDays() {
      const workingDays = parseInt(this.condition.workingDays) ?? 0;
      const holiday = parseInt(this.condition.holiday) ?? 0;

      return workingDays + holiday;
    },
    minimumWage() {
      return this.condition.minimumWage.replace(",", "");
    }
  },
  methods: {
    salaryCalc() {
      this.clearResult();
      const minimumWage = this.minimumWage;
      const workingDays = parseInt(this.condition.workingDays) ?? 0;
      const holiday = parseInt(this.condition.holiday) ?? 0;
      const workHours = parseInt(this.condition.workHours) ?? 0;

      const normalWorkHours = workHours > 10 ? 10 : workHours;

      // 正常工時時數
      let normalMonthWorkHours = normalWorkHours * (workingDays + holiday);
      normalMonthWorkHours = normalMonthWorkHours > 240 ? 240 : normalMonthWorkHours;

      // 加班工時時數
      const overtimeHourPerDay = workHours - 10; //每日加班時數
      const fullTimeOvertimeDays = workingDays > 23 ? workingDays - 23 : 0; //全日加班天數

      //最低基本工資
      const resultMinimumWage = new Decimal(normalMonthWorkHours - average_working_hours_per_month)
        .times(this.hourlyWage)
        .add(minimumWage);

      // 延長工時工資(不含全日加班)
      const totalOvertimeHour = workingDays > 23 ? 23 * overtimeHourPerDay : overtimeHourPerDay * workingDays;
      const overtimePay_NoFullTimeOvertime = new Decimal(totalOvertimeHour)
        .times(this.hourlyWage)
        .times(4)
        .div(3);

      // 全日加班
      let fullTimeOvertimePay = new Decimal(0);

      if (fullTimeOvertimeDays > 0) {
        fullTimeOvertimePay = this.hourlyWage
          .times(4)
          .div(3)
          .times(2)
          .add(fullTimeOvertimePay);
        
        fullTimeOvertimePay = this.hourlyWage
          .times(5)
          .div(3)
          .times(workHours - 2)
          .add(fullTimeOvertimePay);

        fullTimeOvertimePay = fullTimeOvertimePay.mul(fullTimeOvertimeDays);
      }


      console.log(fullTimeOvertimePay.toString());



      // 結果
      this.result.minimumWage = resultMinimumWage.ceil();
      this.result.overtimePay = overtimePay_NoFullTimeOvertime.add(fullTimeOvertimePay).ceil();
      this.result.totalSalary = this.result.minimumWage.add(this.result.overtimePay);
      this.result.hourlyWage = this.result.totalSalary
        .div(workingDays)
        .div(workHours)
        .toDecimalPlaces(3);

      // 紀錄
      this.saveMinimumWage()
    },
    clearResult() {
      this.result = {
        minimumWage: null,
        overtimePay: null,
        totalSalary: null,
        hourlyWage: null
      };
    },
    saveMinimumWage() {
      localStorage.setItem("minimumWage", this.minimumWage);
    },
    getMinimumWage() {
      return localStorage.getItem("minimumWage") ?? ""
    }
  },
  mounted(){
    this.condition.minimumWage = this.getMinimumWage()
  }
});
