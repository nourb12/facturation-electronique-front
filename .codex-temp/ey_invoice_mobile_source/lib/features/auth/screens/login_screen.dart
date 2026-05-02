import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/network/api_config.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/theme/theme_extensions.dart';
import '../../../core/widgets/ey_background.dart';
import '../../../core/widgets/ey_components.dart';
import '../controllers/session_controller.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _obscurePassword = true;
  String? _localError;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _localError = null;
    });

    if (_emailController.text.trim().isEmpty ||
        _passwordController.text.trim().isEmpty) {
      setState(() {
        _localError = 'Renseigne ton email et ton mot de passe.';
      });
      return;
    }

    await context.read<SessionController>().login(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.ey;
    final textTheme = Theme.of(context).textTheme;
    final session = context.watch<SessionController>();
    final themeController = context.read<ThemeController>();
    final errorMessage = session.errorMessage ?? _localError;

    return Scaffold(
      backgroundColor: colors.pageBg,
      body: EyBackground(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        child: SingleChildScrollView(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const EyBrandMark(),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'EY Invoice Mobile',
                            style: textTheme.titleMedium,
                          ),
                          Text(
                            'Authentification sécurisée',
                            style: textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    EyIconAction(
                      icon: context.isDarkMode
                          ? Icons.light_mode_rounded
                          : Icons.dark_mode_rounded,
                      onTap: () {
                        themeController.toggle();
                      },
                      tooltip: 'Changer de thème',
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                EySurfaceCard(
                  padding: const EdgeInsets.all(22),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const EyEyebrow(label: 'Portail mobile'),
                      const SizedBox(height: 16),
                      Text(
                        'Le même univers visuel que le web, pensé pour le scan mobile.',
                        style: textTheme.headlineMedium,
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Connexion au backend existant, double authentification prise en charge, puis OCR local gratuit sur Android et iPhone.',
                        style: textTheme.bodyMedium?.copyWith(
                          color: colors.textSecondary,
                          height: 1.6,
                        ),
                      ),
                      const SizedBox(height: 22),
                      if (errorMessage != null) ...[
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: colors.warn.withValues(alpha: .10),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: colors.warn.withValues(alpha: .22),
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                Icons.error_outline_rounded,
                                color: colors.warn,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  errorMessage,
                                  style: textTheme.bodySmall?.copyWith(
                                    color: colors.warn,
                                    height: 1.6,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                      ],
                      EyTextField(
                        label: 'Adresse email',
                        controller: _emailController,
                        hint: 'exemple@entreprise.tn',
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        prefixIcon: const Icon(Icons.alternate_email_rounded),
                      ),
                      const SizedBox(height: 14),
                      EyTextField(
                        label: 'Mot de passe',
                        controller: _passwordController,
                        hint: 'Saisis ton mot de passe',
                        obscureText: _obscurePassword,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _submit(),
                        prefixIcon: const Icon(Icons.lock_outline_rounded),
                        suffixIcon: IconButton(
                          onPressed: () {
                            setState(() {
                              _obscurePassword = !_obscurePassword;
                            });
                          },
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_off_rounded
                                : Icons.visibility_rounded,
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      EySurfaceCard(
                        padding: const EdgeInsets.all(14),
                        backgroundColor: colors.eySoft.withValues(
                          alpha: context.isDarkMode ? .55 : .40,
                        ),
                        borderColor: colors.eyLine,
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              Icons.verified_user_outlined,
                              color: colors.textPrimary,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'Mode gratuit: OCR local + extraction Regex + validation manuelle avant enregistrement.',
                                style: textTheme.bodySmall?.copyWith(
                                  color: colors.textSecondary,
                                  height: 1.6,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),
                      EyPrimaryButton(
                        label: 'Se connecter',
                        icon: Icons.arrow_forward_rounded,
                        isLoading: session.isBusy,
                        onPressed: _submit,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                EySurfaceCard(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const EyStatusChip(
                            label: '2FA',
                            tone: EyStatusTone.ey,
                          ),
                          const SizedBox(width: 8),
                          const EyStatusChip(
                            label: 'OCR Local',
                            tone: EyStatusTone.ok,
                          ),
                          const SizedBox(width: 8),
                          EyStatusChip(
                            label: context.isDarkMode ? 'Dark' : 'Light',
                            tone: EyStatusTone.neutral,
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(
                        'API locale configurée',
                        style: textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        ApiConfig.baseUrl,
                        style: textTheme.labelSmall?.copyWith(
                          color: colors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
