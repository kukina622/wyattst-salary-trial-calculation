import {
  month_name_list,
  average_working_hours_per_month
} from "./constant.js";

export default new Vue({
  el: "#app",
  data: {
    page: 1,
    salaryCalcCondition: {
      monthName: "",
      minimumWage: "",
      workHours: "",
      breakTime: "",
      workingDays: "",
      containHoliday: true
    },
    salaryCalcResult: {
      minimumWage: null,
      overtimePay: null,
      totalSalary: null,
      hourlyWage: null,
      overtimePay_NoFullTimeOvertime: null,
      fullTimeOvertimePay: null
    },
    breakTimeCalcCondition:{
      minimumWage: "",
      workHours:"",
      workingDays:"",
      expectSalary:"",
      containHoliday: true
    },
    breakTimeCalcResult:{
      dailyBreakTime:""
    }
  },
  computed: {
    hourlyWage() {
      return new Decimal(this.minimumWage)
        .div(8)
        .div(30);
    },
    minimumWage() {
      return this.computedCondition.minimumWage?.replace(",", "");
    },
    holiday() {
      return this.computedCondition.containHoliday ? 1 : 0
    },
    computedCondition(){
      switch (page) {
        case 1:
          return this.salaryCalcCondition
        case 2:
          return this.breakTimeCalcCondition
      }
    }
  },
  methods: {
    /**
     * 依據salaryCalcCondition計算薪資
     * 完成後將結果存入 salaryCalcResult
     */
    salaryCalc() {
      this.clearResult();
      const minimumWage = parseInt(this.minimumWage) || 0;
      const holiday = this.holiday
      const workingDays = parseInt(this.salaryCalcCondition.workingDays) || 0;
      const workHours = parseInt(this.salaryCalcCondition.workHours) || 0;

      const normalWorkHours = workHours > 10 ? 10 : workHours;

      // 正常工時時數
      let normalMonthWorkHours = normalWorkHours * (workingDays + holiday);
      

      // 加班工時時數
      const overtimeHourPerDay = workHours > 10 ? workHours - 10 : 0; //每日加班時數
  
      // 全日加班時數
      // 假設每天沒加班
      let fullTimeOvertimeHours = normalMonthWorkHours > 240 ? normalMonthWorkHours - 240 : 0;
      let fullTimeOvertimeDays = Math.floor(fullTimeOvertimeHours / workHours);

      // 假如每天有加班
      // 全日加班 = 工時*全日加班天數
      if (overtimeHourPerDay > 0)  {
        fullTimeOvertimeDays = ((normalMonthWorkHours - 240) / 10)
        fullTimeOvertimeHours = workHours * fullTimeOvertimeDays
      }

      // 超過240小時以240計
      normalMonthWorkHours = normalMonthWorkHours > 240 ? 240 : normalMonthWorkHours;
      //最低基本工資
      const resultMinimumWage = new Decimal(normalMonthWorkHours - average_working_hours_per_month)
        .times(this.hourlyWage)
        .add(minimumWage);

      // 延長工時工資(不含全日加班)
      const totalOvertimeHour = fullTimeOvertimeHours > 0 ? (workingDays - fullTimeOvertimeDays) * overtimeHourPerDay : overtimeHourPerDay * workingDays;
      const overtimePay_NoFullTimeOvertime = new Decimal(totalOvertimeHour)
        .times(this.hourlyWage)
        .times(4)
        .div(3);

      // 全日加班
      let fullTimeOvertimePay = new Decimal(0);

      // 假設前一天有加班
      if (fullTimeOvertimeHours % workHours !== 0) {
        const first = fullTimeOvertimeHours % workHours;
        if (first > 2) {
          fullTimeOvertimePay = this.hourlyWage
            .times(4)
            .div(3)
            .times(2)
            .add(fullTimeOvertimePay);
          fullTimeOvertimePay = this.hourlyWage
            .times(5)
            .div(3)
            .times(first - 2)
            .add(fullTimeOvertimePay);
        } else {
          fullTimeOvertimePay = this.hourlyWage
            .times(4)
            .div(3)
            .times(first)
            .add(fullTimeOvertimePay);
        }
      }


      if (fullTimeOvertimeDays > 0) {
        let _fullTimeOvertimePay = new Decimal(0)

        _fullTimeOvertimePay = this.hourlyWage
          .times(4)
          .div(3)
          .times(2)
          .add(_fullTimeOvertimePay);
        
        _fullTimeOvertimePay = this.hourlyWage
          .times(5)
          .div(3)
          .times(workHours - 2)
          .add(_fullTimeOvertimePay);

        fullTimeOvertimePay = _fullTimeOvertimePay.mul(fullTimeOvertimeDays).add(fullTimeOvertimePay);
      }


      // 結果
      this.salaryCalcResult.minimumWage = resultMinimumWage.ceil();
      this.salaryCalcResult.overtimePay_NoFullTimeOvertime = overtimePay_NoFullTimeOvertime.ceil();
      this.salaryCalcResult.fullTimeOvertimePay = fullTimeOvertimePay.ceil();
      this.salaryCalcResult.overtimePay = overtimePay_NoFullTimeOvertime.add(fullTimeOvertimePay).ceil();
      this.salaryCalcResult.totalSalary = this.salaryCalcResult.minimumWage.add(this.salaryCalcResult.overtimePay);
      this.salaryCalcResult.hourlyWage = this.salaryCalcResult.totalSalary
        .div(workingDays)
        .div(workHours)
        .toDecimalPlaces(3);

      // 紀錄
      this.saveMinimumWage()
    },
    clearResult() {
      this.salaryCalcResult = {
        minimumWage: null,
        overtimePay: null,
        totalSalary: null,
        hourlyWage: null,
        overtimePay_NoFullTimeOvertime: null,
        fullTimeOvertimePay: null
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
    this.salaryCalcCondition.minimumWage = this.getMinimumWage()
  }
});
