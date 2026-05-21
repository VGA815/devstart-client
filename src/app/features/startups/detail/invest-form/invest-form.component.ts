import { Component, ChangeDetectionStrategy, inject, signal, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { StartupDetailFacade } from '../startup-detail.facade';

@Component({
  selector: 'app-invest-form',
  standalone: true,
  imports: [RouterLink, SkeletonComponent],
  templateUrl: './invest-form.component.html',
  styleUrl: './invest-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestFormComponent {
  protected readonly facade = inject(StartupDetailFacade);


  readonly close = output<void>();

  readonly investAmount        = signal('');
  readonly investRoadmapId     = signal('');
  readonly investMessage       = signal('');
  readonly investInstrument    = signal(0); // 0=SAFE, 1=ConvertibleLoan, 2=PricedRound
  readonly investValuationCap    = signal('');
  readonly investDiscount        = signal('');
  readonly investInterestRate    = signal('');
  readonly investTermMonths      = signal('');
  readonly investPreMoney        = signal('');
  readonly investLiquidationPref = signal('');
  readonly investProRata         = signal(false);
  readonly suggestedTermsLoading = signal(false);
  readonly investSubmitting      = signal(false);
  readonly investError           = signal('');
  readonly investSuccess         = signal(false);

  loadSuggestedTerms(): void {
    const amount = parseFloat(this.investAmount());
    if (!amount || isNaN(amount) || amount <= 0) return;
    if (!this.facade.investorProfile()) return;

    this.suggestedTermsLoading.set(true);
    this.facade.loadSuggestedTerms(this.investInstrument(), amount).subscribe(terms => {
      if (terms) {
        this.investValuationCap.set(terms.valuationCap != null ? String(terms.valuationCap) : '');
        this.investDiscount.set(terms.discount != null ? String(terms.discount) : '');
        this.investInterestRate.set(terms.interestRate != null ? String(terms.interestRate) : '');
        this.investTermMonths.set(terms.termMonths != null ? String(terms.termMonths) : '');
        this.investPreMoney.set(terms.preMoneyValuation != null ? String(terms.preMoneyValuation) : '');
        this.investLiquidationPref.set(terms.liquidationPreference != null ? String(terms.liquidationPreference) : '');
        this.investProRata.set(terms.proRataRights);
      }
      this.suggestedTermsLoading.set(false);
    });
  }

  submit(): void {
    const profile = this.facade.investorProfile();
    if (!profile) return;

    const amountNum = parseFloat(this.investAmount());
    if (!this.investAmount() || isNaN(amountNum) || amountNum <= 0) {
      this.investError.set('Укажите корректную сумму инвестиций');
      return;
    }

    this.investSubmitting.set(true);
    this.investError.set('');

    const parseNum = (s: string) => { const n = parseFloat(s); return isNaN(n) ? undefined : n; };

    this.facade.submitApplication({
      roadmap_item_id: this.investRoadmapId() || undefined,
      amount: amountNum,
      message: this.investMessage().trim() || undefined,
      instrument: this.investInstrument(),
      valuation_cap: parseNum(this.investValuationCap()),
      discount: parseNum(this.investDiscount()),
      interest_rate: parseNum(this.investInterestRate()),
      term_months: parseNum(this.investTermMonths()),
      pre_money_valuation: parseNum(this.investPreMoney()),
      liquidation_preference: parseNum(this.investLiquidationPref()),
      pro_rata_rights: this.investProRata(),
    }).subscribe(id => {
      this.investSubmitting.set(false);
      if (!id) {
        this.investError.set('Не удалось отправить заявку. Попробуйте снова.');
        return;
      }
      this.investSuccess.set(true);
    });
  }
}
