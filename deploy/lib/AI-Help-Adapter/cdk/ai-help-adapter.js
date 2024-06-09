import lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Stack, CfnOutput, CfnParameter, Duration } from 'aws-cdk-lib';
import * as path from 'path';
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AIHelpAdapter extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);
      // 定义 Lambda 层和函数的代码

    const SECRET_KEY = new CfnParameter(this, 'SECRET_KEY', {
        type: 'String',
        default: 'SECRET_KEY',
        description: 'Enter a value for SECRET_KEY',
      });

    const lambdaLayerZipFilePath = '../layers/layer_content.zip';
    const layer = new lambda.LayerVersion(this, 'AIHelpAdapterLambdaLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, lambdaLayerZipFilePath)),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_10]
    });

    const aiHelpAdapterLambdaRole = new iam.Role(this, 'PromptTemplateLambdaRole', {
      roleName: `ai-help-lambda-role--${cdk.Stack.of(this).region}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchFullAccess'),
      ],
      inlinePolicies: {
        'LambdaInvokePolicy': new iam.PolicyDocument({
            assignSids: true,
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        'lambda:InvokeFunction'
                    ],
                    resources: [
                        '*'
                    ]
                })
            ]
        })
    }
  });


    const lambdaFunction = new lambda.Function(this, 'AIHelpAdapter', {
      runtime: lambda.Runtime.PYTHON_3_10,
      code: lambda.Code.fromAsset('./lib/AI-Help-Adapter/lambda'),
      handler: 'lambda_handler.lambda_handler',
      layers: [layer],
      timeout: Duration.minutes(2),
      environment: {
        SECRET_KEY: SECRET_KEY,
        ASK_ASSISTANT_FUNC_ARN:process.env.MAIN_FUN_ARN,
      },
      memorySize: 256,
    });

    // 定义 API Gateway 和与 Lambda 函数的关联
    const api = new apigw.RestApi(this, 'AI-Help-Adapter-API');

    const resource = api.root.addResource('adapter-aihelp');
    resource.addMethod('POST', new apigw.LambdaIntegration(lambdaFunction, { proxy: true }), {
      methodResponses: [{ statusCode: '200' }],
    });
    this.endpoint = api.url;
    new CfnOutput(this, `AI Help Adapter endpoint url`,{value:`${api.url}`});
  }
}