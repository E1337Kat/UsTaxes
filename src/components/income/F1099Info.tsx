import { Fragment, ReactElement, useState } from 'react'
import _ from 'lodash'
import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'
import Alert from '@material-ui/lab/Alert'
import { useForm, FormProvider } from 'react-hook-form'
import { Icon, Grid, Paper, Box, Button } from '@material-ui/core'
import { useDispatch, useSelector, TaxesState } from 'ustaxes/redux'
import { add1099, edit1099, remove1099 } from 'ustaxes/redux/actions'
import { usePager } from 'ustaxes/components/pager'
import {
  Person,
  PersonRole,
  Supported1099,
  Income1099Type,
  PlanType1099,
  PlanType1099Texts,
  PlanType1099SA,
  F1099SABox3Code,
  F1099SABox3CodeDescriptions,
  F1099SABox3Info,
  PlanType1099SATexts
} from 'ustaxes/core/data'
import {
  Currency,
  formatSSID,
  GenericLabeledDropdown,
  LabeledInput,
  boxLabel,
  LabeledCheckbox
} from 'ustaxes/components/input'
import { Patterns } from 'ustaxes/components/Patterns'
import { FormListContainer } from 'ustaxes/components/FormContainer'
import {
  enumKeys,
  intentionallyFloat,
  parseFormNumber
} from 'ustaxes/core/util'

const showIncome = (a: Supported1099): ReactElement => {
  switch (a.type) {
    case Income1099Type.INT: {
      return <Currency value={a.form.income} />
    }
    case Income1099Type.B: {
      const ltg = a.form.longTermProceeds - a.form.longTermCostBasis
      const stg = a.form.shortTermProceeds - a.form.shortTermCostBasis
      return (
        <span>
          Long term: <Currency value={ltg} />
          <br />
          Short term: <Currency value={stg} />
        </span>
      )
    }
    case Income1099Type.DIV: {
      return <Currency value={a.form.dividends} />
    }
    case Income1099Type.R: {
      return (
        <span>
          Plan Type: {a.form.planType}
          <br />
          Gross Distribution: <Currency value={a.form.grossDistribution} />
          <br />
          Taxable Amount: <Currency value={a.form.taxableAmount} />
          <br />
          Federal Income Tax Withheld:{' '}
          <Currency value={a.form.federalIncomeTaxWithheld} />
        </span>
      )
    }
    case Income1099Type.SSA: {
      return (
        <span>
          {/* Benefits Paid: <Currency value={a.form.benefitsPaid} />
          <br />
          Benefits Repaid: <Currency value={a.form.benefitsRepaid} />
          <br /> */}
          Net Benefits: <Currency value={a.form.netBenefits} />
          <br />
          Federal Income Tax Withweld:{' '}
          <Currency value={a.form.federalIncomeTaxWithheld} />
        </span>
      )
    }
    case Income1099Type.DA: {
      const ltg = a.form.longTermProceeds - a.form.longTermCostBasis
      const stg = a.form.shortTermProceeds - a.form.shortTermCostBasis
      return (
        <span>
          Long term: <Currency value={ltg} />
          <br />
          Short term: <Currency value={stg} />
        </span>
      )
    }
    case Income1099Type.SA: {
      const gross = a.form.grossDistribution
      return (
        <span>
          Gross: <Currency value={gross} />
          <br />
          Plan Type: {a.form.planType}
        </span>
      )
    }
    case Income1099Type.G: {
      return (
        <span>
          Long term: <Currency value={a.form.unemploymentComp} />
          <br />
          Federal Income Tax Withweld:{' '}
          <Currency value={a.form.federalIncomeTaxWithheld} />
        </span>
      )
    }
  }
}

interface F1099UserInput {
  formType: Income1099Type | undefined
  payer: string
  // Int fields
  interest: string | number
  // B Fields
  shortTermProceeds: string | number
  shortTermCostBasis: string | number
  longTermProceeds: string | number
  longTermCostBasis: string | number
  // Div fields
  dividends: string | number
  qualifiedDividends: string | number
  totalCapitalGainsDistributions: string | number
  personRole?: PersonRole.PRIMARY | PersonRole.SPOUSE
  // R fields
  grossDistribution: string | number
  taxableAmount: string | number
  federalIncomeTaxWithheld: string | number
  RPlanType: PlanType1099
  // SA fields
  SAGrossDistribution: string | number
  earningOnExcess: string | number
  SAPlanType: PlanType1099SA
  f1099SABox3: F1099SABox3Info<string>
  // G fields
  unemploymentComp: string | number
  stateLocalTaxRefundCreditOrOffsets: string | number
  GFederalIncomeTaxWithheld: string | number
  rtaaPayments: string | number
  taxableGrants: string | number
  agriculturePayments: string | number
  tradeOrBusiness: boolean
  marketGain: string | number
  state: string
  stateIdNumber: string
  stateIncomeTaxWithheld: string | number
  // SSA fields
  // benefitsPaid: string | number
  // benefitsRepaid: string | number
  netBenefits: string | number
}

const blankUserInput: F1099UserInput = {
  formType: undefined,
  payer: '',
  interest: '',
  // B Fields
  shortTermProceeds: '',
  shortTermCostBasis: '',
  longTermProceeds: '',
  longTermCostBasis: '',
  // Div fields
  dividends: '',
  qualifiedDividends: '',
  totalCapitalGainsDistributions: '',
  // R fields
  grossDistribution: '',
  taxableAmount: '',
  federalIncomeTaxWithheld: '',
  RPlanType: PlanType1099.Pension,
  // SA fields
  SAGrossDistribution: '',
  earningOnExcess: '',
  SAPlanType: PlanType1099SA.HSA,
  f1099SABox3: {},
  // G fields
  unemploymentComp: '',
  stateLocalTaxRefundCreditOrOffsets: '',
  GFederalIncomeTaxWithheld: '',
  rtaaPayments: '',
  taxableGrants: '',
  agriculturePayments: '',
  tradeOrBusiness: false,
  marketGain: '',
  state: '',
  stateIdNumber: '',
  stateIncomeTaxWithheld: '',
  // SSA fields
  // benefitsPaid: '',
  // benefitsRepaid: '',
  netBenefits: ''
}

const toUserInput = (f: Supported1099): F1099UserInput => ({
  ...blankUserInput,
  formType: f.type,
  payer: f.payer,
  personRole: f.personRole,

  ...(() => {
    switch (f.type) {
      case Income1099Type.INT: {
        return {
          interest: f.form.income
        }
      }
      case Income1099Type.B: {
        return f.form
      }
      case Income1099Type.DIV: {
        return f.form
      }
      case Income1099Type.R: {
        return f.form
      }
      case Income1099Type.SSA: {
        return f.form
      }
      case Income1099Type.DA: {
        return f.form
      }
      case Income1099Type.SA: {
        return {
          ...f.form,
          f1099SABox3: _.mapValues(f.form.f1099SABox3, (v) => v?.toString())
        }
      }
      case Income1099Type.G: {
        return f.form
      }
    }
  })()
})

const toF1099 = (input: F1099UserInput): Supported1099 | undefined => {
  switch (input.formType) {
    case Income1099Type.INT: {
      return {
        payer: input.payer,
        personRole: input.personRole ?? PersonRole.PRIMARY,
        type: input.formType,
        form: {
          income: Number(input.interest)
        }
      }
    }
    case Income1099Type.B: {
      return {
        payer: input.payer,
        personRole: input.personRole ?? PersonRole.PRIMARY,
        type: input.formType,
        form: {
          shortTermCostBasis: Number(input.shortTermCostBasis),
          shortTermProceeds: Number(input.shortTermProceeds),
          longTermCostBasis: Number(input.longTermCostBasis),
          longTermProceeds: Number(input.longTermProceeds)
        }
      }
    }
    case Income1099Type.DIV: {
      return {
        payer: input.payer,
        personRole: input.personRole ?? PersonRole.PRIMARY,
        type: input.formType,
        form: {
          dividends: Number(input.dividends),
          qualifiedDividends: Number(input.qualifiedDividends),
          totalCapitalGainsDistributions: Number(
            input.totalCapitalGainsDistributions
          )
        }
      }
    }
    case Income1099Type.R: {
      return {
        payer: input.payer,
        personRole: input.personRole ?? PersonRole.PRIMARY,
        type: input.formType,
        form: {
          grossDistribution: Number(input.grossDistribution),
          taxableAmount: Number(input.taxableAmount),
          federalIncomeTaxWithheld: Number(input.federalIncomeTaxWithheld),
          planType: PlanType1099.Pension
        }
      }
    }
    case Income1099Type.SSA: {
      return {
        payer: input.payer,
        personRole: input.personRole ?? PersonRole.PRIMARY,
        type: input.formType,
        form: {
          // benefitsPaid: Number(input.benefitsPaid),
          // benefitsRepaid: Number(input.benefitsRepaid),
          netBenefits: Number(input.netBenefits),
          federalIncomeTaxWithheld: Number(input.federalIncomeTaxWithheld)
        }
      }
    }
    case Income1099Type.DA: {
      return {
        payer: input.payer,
        personRole: input.personRole ?? PersonRole.PRIMARY,
        type: input.formType,
        form: {
          shortTermCostBasis: Number(input.shortTermCostBasis),
          shortTermProceeds: Number(input.shortTermProceeds),
          longTermCostBasis: Number(input.longTermCostBasis),
          longTermProceeds: Number(input.longTermProceeds)
        }
      }
    }
    case Income1099Type.SA: {
      return {
        payer: input.payer,
        personRole: input.personRole ?? PersonRole.PRIMARY,
        type: input.formType,
        form: {
          grossDistribution: Number(input.SAGrossDistribution),
          earningOnExcess: Number(input.earningOnExcess),
          f1099SABox3: _.mapValues(input.f1099SABox3, (v) =>
            parseFormNumber(v)
          ),
          planType: input.SAPlanType
        }
      }
    }
    case Income1099Type.G: {
      return {
        payer: input.payer,
        personRole: input.personRole ?? PersonRole.PRIMARY,
        type: input.formType,
        form: {
          unemploymentComp: Number(input.unemploymentComp),
          stateLocalTaxRefundCreditOrOffsets: Number(
            input.stateLocalTaxRefundCreditOrOffsets
          ),
          federalIncomeTaxWithheld: Number(input.GFederalIncomeTaxWithheld),
          rtaaPayments: Number(input.rtaaPayments),
          taxableGrants: Number(input.taxableGrants),
          agriculturePayments: Number(input.agriculturePayments),
          tradeOrBusiness: input.tradeOrBusiness,
          marketGain: Number(input.marketGain),
          state: input.state,
          stateIdNumber: input.stateIdNumber,
          stateIncomeTaxWithheld: Number(input.stateIncomeTaxWithheld)
        }
      }
    }
  }
}

export default function F1099Info(): ReactElement {
  const f1099s = useSelector((state: TaxesState) => state.information.f1099s)

  const defaultValues = blankUserInput

  const methods = useForm<F1099UserInput>({ defaultValues })
  const { handleSubmit, watch } = methods
  const selectedType: Income1099Type | undefined = watch('formType')

  const dispatch = useDispatch()

  const { onAdvance, navButtons } = usePager()

  const onSubmitAdd = (formData: F1099UserInput): void => {
    const payload = toF1099(formData)
    if (payload !== undefined) {
      dispatch(add1099(payload))
    }
  }

  const [editF1099SABox3, setEditF1099SABox3] = useState(false)

  const { getValues } = useForm<F1099UserInput>({ defaultValues })

  const { f1099SABox3 } = getValues()

  const onSubmitEdit =
    (index: number) =>
    (formData: F1099UserInput): void => {
      const payload = toF1099(formData)
      if (payload !== undefined) {
        dispatch(edit1099({ value: payload, index }))
      }
    }

  const people: Person[] = useSelector((state: TaxesState) => [
    state.information.taxPayer.primaryPerson,
    state.information.taxPayer.spouse
  ])
    .filter((p) => p !== undefined)
    .map((p) => p as Person)

  const intFields = (
    <Grid container spacing={2}>
      <LabeledInput
        label={
          <>
            <strong>Box 1</strong> - Interest Income
          </>
        }
        patternConfig={Patterns.currency}
        name="interest"
      />
    </Grid>
  )

  const bFields = (
    <>
      <h3>Long Term Covered Transactions</h3>
      <Grid container spacing={2}>
        <LabeledInput
          label="Proceeds"
          patternConfig={Patterns.currency}
          name="longTermProceeds"
          sizes={{ xs: 6 }}
        />
        <LabeledInput
          label="Cost basis"
          patternConfig={Patterns.currency}
          name="longTermCostBasis"
          sizes={{ xs: 6 }}
        />
      </Grid>
      <h3>Short Term Covered Transactions</h3>
      <Grid container spacing={2}>
        <LabeledInput
          label="Proceeds"
          patternConfig={Patterns.currency}
          name="shortTermProceeds"
          sizes={{ xs: 6 }}
        />
        <LabeledInput
          label="Cost basis"
          patternConfig={Patterns.currency}
          name="shortTermCostBasis"
          sizes={{ xs: 6 }}
        />
      </Grid>
    </>
  )

  const divFields = (
    <Grid container spacing={2}>
      <LabeledInput
        label={boxLabel('1a', 'Total Dividends')}
        patternConfig={Patterns.currency}
        name="dividends"
      />
      <LabeledInput
        label={boxLabel('1b', 'Qualified Dividends')}
        patternConfig={Patterns.currency}
        name="qualifiedDividends"
      />
      <LabeledInput
        label={boxLabel('2a', 'Total capital gains distributions')}
        patternConfig={Patterns.currency}
        name="totalCapitalGainsDistributions"
      />
    </Grid>
  )

  const rFields = (
    <Grid container spacing={2}>
      <Alert severity="warning">
        Use this form only for 1099-R forms related to your 401(k) or other
        retirement plans. If you have 1099-R forms from IRA accounts please see
        the <Link to="/savingsaccounts/ira">IRA page</Link>
      </Alert>
      <LabeledInput
        label={boxLabel('1', 'Gross Distribution')}
        patternConfig={Patterns.currency}
        name="grossDistribution"
      />
      <LabeledInput
        label={boxLabel('2a', 'Taxable Amount')}
        patternConfig={Patterns.currency}
        name="taxableAmount"
      />
      <LabeledInput
        label={boxLabel('4', 'Federal Income Tax Withheld')}
        patternConfig={Patterns.currency}
        name="federalIncomeTaxWithheld"
      />
      <GenericLabeledDropdown<PlanType1099, F1099UserInput>
        label="Type of 1099-R"
        dropDownData={Object.values(PlanType1099)}
        valueMapping={(x) => x}
        keyMapping={(_, i) => i}
        textMapping={(status) => PlanType1099Texts[status]}
        name="RPlanType"
      />
    </Grid>
  )

  const ssaFields = (
    <Grid container spacing={2}>
      {/* <LabeledInput
        label="Box 3 - Benefits Paid"
        patternConfig={Patterns.currency}
        name="benefitsPaid"
      />
      <LabeledInput
        label="Box 4 - Benefits Repaid"
        patternConfig={Patterns.currency}
        name="benefitsRepaid"
      /> */}
      <LabeledInput
        label={
          <>
            <strong>Box 5</strong> - Net Benefits
          </>
        }
        patternConfig={Patterns.currency}
        name="netBenefits"
      />
      <LabeledInput
        label={
          <>
            <strong>Box 6</strong> - Voluntary Federal Income Tax Withheld
          </>
        }
        patternConfig={Patterns.currency}
        name="federalIncomeTaxWithheld"
      />
    </Grid>
  )

  const f1099SABox3Fields = (
    <>
      {enumKeys(F1099SABox3Code).map((code) => (
        <Fragment key={`f-1099-sa-box-3-${code}`}>
          <p>
            <strong>Code {code}</strong>: {F1099SABox3CodeDescriptions[code]}
          </p>
          <LabeledInput
            label={code}
            name={`f1099SABox3.${code}`}
            patternConfig={Patterns.currency}
            required={false}
          />
        </Fragment>
      ))}
    </>
  )

  const openCloseButton = (
    <Button
      type="button"
      variant="contained"
      color={editF1099SABox3 ? 'secondary' : 'default'}
      onClick={() => setEditF1099SABox3(!editF1099SABox3)}
    >
      {editF1099SABox3 ? 'Done' : 'Edit'}
    </Button>
  )

  const f1099SABox3Data = (
    <ul>
      {enumKeys(F1099SABox3Code)
        .filter((code) => f1099SABox3[code] !== undefined)
        .map((code) => (
          <li key={`box-3-data-${code}`}>
            {code}:{' '}
            <Currency plain value={parseFormNumber(f1099SABox3[code]) ?? 0} /> (
            {F1099SABox3CodeDescriptions[code]})
          </li>
        ))}
    </ul>
  )

  const saFields = (
    <Grid container spacing={2}>
      <Alert severity="warning">
        Use this form only for 1099-R forms related to your 401(k) or other
        retirement plans. If you have 1099-R forms from IRA accounts please see
        the <Link to="/savingsaccounts/ira">IRA page</Link>
      </Alert>
      <LabeledInput
        label={boxLabel('1', 'Gross Distribution')}
        patternConfig={Patterns.currency}
        name="SAGrossDistribution"
      />
      <LabeledInput
        label={boxLabel('2', 'Earning on excess cont.')}
        patternConfig={Patterns.currency}
        name="earningOnExcess"
      />
      <Paper>
        <Box padding={2} paddingTop={2}>
          <h4>Box 3 Information</h4>
          {editF1099SABox3 ? f1099SABox3Fields : f1099SABox3Data}
          <Box paddingTop={1}>{openCloseButton}</Box>
        </Box>
      </Paper>
      <GenericLabeledDropdown<PlanType1099SA, F1099UserInput>
        label="Type of 1099-SA"
        dropDownData={Object.values(PlanType1099SA)}
        valueMapping={(x) => x}
        keyMapping={(_, i) => i}
        textMapping={(status) => PlanType1099SATexts[status]}
        name="SAPlanType"
      />
    </Grid>
  )

  const gFields = (
    <Grid container spacing={2}>
      <LabeledInput
        label={boxLabel('1', 'Unemployment compensation')}
        patternConfig={Patterns.currency}
        name="unemploymentComp"
      />
      <LabeledInput
        label={boxLabel(
          '2',
          'State or local income tax refunds, credits, or offsets'
        )}
        patternConfig={Patterns.currency}
        name="stateLocalTaxRefundCreditOrOffsets"
      />
      <LabeledInput
        label={boxLabel('4', 'Federal Income Tax Withheld')}
        patternConfig={Patterns.currency}
        name="GFederalIncomeTaxWithheld"
      />
      <LabeledInput
        label={boxLabel('5', 'RTAA payments')}
        patternConfig={Patterns.currency}
        name="rtaaPayments"
      />
      <LabeledInput
        label={boxLabel('6', 'Taxable grants')}
        patternConfig={Patterns.currency}
        name="taxableGrants"
      />
      <LabeledInput
        label={boxLabel('7', 'Agriculture payments')}
        patternConfig={Patterns.currency}
        name="agriculturePayments"
      />
      <LabeledCheckbox
        label=" Check if box 2 is trade or business income"
        name="tradeOrBusiness"
      />
      <LabeledInput
        label={boxLabel('9', 'Market gain')}
        patternConfig={Patterns.currency}
        name="marketGain"
      />
      <LabeledInput
        label={boxLabel('10a', 'State')}
        patternConfig={Patterns.name}
        name="state"
      />
      <LabeledInput
        label={boxLabel('10b', 'State identification no.')}
        patternConfig={Patterns.number}
        name="stateIdNumber"
      />
      <LabeledInput
        label={boxLabel('11', 'State income tax withheld')}
        patternConfig={Patterns.currency}
        name="stateIncomeTaxWithheld"
      />
    </Grid>
  )

  const specificFields = {
    [Income1099Type.INT]: intFields,
    [Income1099Type.B]: bFields,
    [Income1099Type.DIV]: divFields,
    [Income1099Type.R]: rFields,
    [Income1099Type.SSA]: ssaFields,
    [Income1099Type.DA]: bFields,
    [Income1099Type.SA]: saFields,
    [Income1099Type.G]: gFields
  }

  const titles = {
    [Income1099Type.INT]: '1099-INT',
    [Income1099Type.B]: '1099-B',
    [Income1099Type.DIV]: '1099-DIV',
    [Income1099Type.R]: '1099-R',
    [Income1099Type.SSA]: 'SSA-1099',
    [Income1099Type.DA]: '1099-DA',
    [Income1099Type.SA]: '1099-SA',
    [Income1099Type.G]: '1099-G'
  }

  const form: ReactElement | undefined = (
    <FormListContainer
      defaultValues={defaultValues}
      onSubmitAdd={onSubmitAdd}
      onSubmitEdit={onSubmitEdit}
      items={f1099s.map((a) => toUserInput(a))}
      removeItem={(i) => dispatch(remove1099(i))}
      primary={(f) => f.payer}
      secondary={(f) => {
        const form = toF1099(f)
        if (form !== undefined) {
          return showIncome(form)
        }
        return ''
      }}
      icon={(f) => (
        <Icon
          style={{ lineHeight: 1 }}
          title={f.formType !== undefined ? titles[f.formType] : undefined}
        >
          {f.formType}
        </Icon>
      )}
    >
      <p>Input data from 1099</p>
      <Grid container spacing={2}>
        <GenericLabeledDropdown
          autofocus={true}
          dropDownData={Object.values(Income1099Type)}
          label="Form Type"
          valueMapping={(v) => v}
          name="formType"
          keyMapping={(_, i: number) => i}
          textMapping={(name: string) => `1099-${name}`}
        />

        <LabeledInput
          label="Enter name of bank, broker firm, or other payer"
          required={true}
          name="payer"
        />
      </Grid>
      {selectedType !== undefined ? specificFields[selectedType] : undefined}
      <Grid container spacing={2}>
        <GenericLabeledDropdown
          dropDownData={people}
          label="Recipient"
          valueMapping={(p: Person, i: number) =>
            [PersonRole.PRIMARY, PersonRole.SPOUSE][i]
          }
          name="personRole"
          keyMapping={(p: Person, i: number) => i}
          textMapping={(p: Person) =>
            `${p.firstName} ${p.lastName} (${formatSSID(p.ssid)})`
          }
        />
      </Grid>
    </FormListContainer>
  )

  return (
    <FormProvider {...methods}>
      <form
        tabIndex={-1}
        onSubmit={intentionallyFloat(handleSubmit(onAdvance))}
      >
        <Helmet>
          <title>1099 Information | Income | UsTaxes.org</title>
        </Helmet>
        <h2>1099 Information</h2>
        {form}
        {navButtons}
      </form>
    </FormProvider>
  )
}
